import Phaser from 'phaser'
import { IEntity, IWorld, TerrainType } from '../types'
import { computeVisibleTiles, DEFAULT_VISIBILITY_SIZE, isTileVisible, tileKey } from './visibility'

export const TILE_W = 64
export const TILE_H = 32

const ENTITY_RADIUS = 10
const ENTITY_Y_OFFSET = TILE_H * 0.3
const HUD_MARGIN = 16
const MINI_MAP_SIZE = 120
const MINI_MAP_PADDING = 10
const INFO_PANEL_MARGIN = 16
const INFO_PANEL_WIDTH = 220
const INFO_PANEL_PADDING = 12
const INFO_PANEL_ROW_HEIGHT = 18
const INFO_PANEL_TITLE_HEIGHT = 20
const INFO_PANEL_TITLE_SIZE = 16
const INFO_PANEL_TEXT_SIZE = 14
const INFO_PANEL_FOOTER_SIZE = 12
const INFO_PANEL_DEPTH = 40
const INFO_PANEL_HEALTH_BAR_WIDTH = 52
const INFO_PANEL_HEALTH_BAR_HEIGHT = 6
const INFO_PANEL_CLOSE_SIZE = 16
const INFO_PANEL_ICON_SIZE = 22
const WALL_HEIGHT = TILE_H
const FOG_COLOR = 0x0b1120
const FOG_ALPHA = 0.78
const FOG_EXPLORED_COLOR = 0x0f172a
const FOG_EXPLORED_ALPHA = 0.45

const TERRAIN_COLORS: Record<TerrainType, number> = {
  grass: 0x5cb85c,
  dirt: 0xb37b4d,
  sand: 0xf4d35e,
  water: 0x4d8dd6,
  wall: 0x4b5563,
}

const WALL_COLORS = {
  top: 0x4b5563,
  left: 0x1f2937,
  right: 0x374151,
  outline: 0x0f172a,
}

const ENTITY_COLORS: Record<string, number> = {
  player: 0x3b82f6,
  enemy: 0xef4444,
  npc: 0xfbbf24,
}

// Convert grid coordinates into isometric screen space.
export function gridToScreen(
  row: number,
  col: number,
  originX: number,
  originY: number,
): { x: number; y: number } {
  return {
    x: originX + (col - row) * (TILE_W / 2),
    y: originY + (col + row) * (TILE_H / 2),
  }
}

// Convert screen coordinates back into the nearest grid cell.
export function screenToGrid(
  screenX: number,
  screenY: number,
  originX: number,
  originY: number,
): { row: number; col: number } {
  const relX = screenX - originX
  const relY = screenY - originY

  return {
    row: Math.floor(relY / TILE_H - relX / TILE_W),
    col: Math.floor(relY / TILE_H + relX / TILE_W),
  }
}

// Responsible for drawing the world, entities, and HUD each frame.
export class IsoRenderer {
  private exploredTiles = new Set<string>()
  private infoPanelVisible = true
  private infoPanelTitle?: Phaser.GameObjects.Text
  private infoPanelLines: Phaser.GameObjects.Text[] = []
  private infoPanelFooter?: Phaser.GameObjects.Text
  private infoButtonZone?: Phaser.GameObjects.Zone
  private infoButtonText?: Phaser.GameObjects.Text
  private closeButtonZone?: Phaser.GameObjects.Zone
  private closeButtonText?: Phaser.GameObjects.Text

  // Graphics is reused; world/entities are pulled live every render.
  constructor(
    private graphics: Phaser.GameObjects.Graphics,
    private world: IWorld,
    private getEntities: () => IEntity[],
    private screenWidth: number,
    private screenHeight: number,
  ) {}

  // Clear and redraw everything in a consistent order each frame.
  render(): void {
    this.graphics.clear()
    const visibility = this.getVisibility()
    this.drawTiles(visibility)
    this.drawHover(visibility)
    this.drawMoveHints(visibility)
    this.drawEntities(visibility)
    this.drawInfoPanel()
    this.drawMiniMap(visibility)
  }

  // Draw terrain tiles with fog-of-war overlays.
  private drawTiles(visibility: VisibilityState): void {
    const { originX, originY } = this.getOrigin()

    for (let row = 0; row < this.world.rows; row += 1) {
      for (let col = 0; col < this.world.cols; col += 1) {
        const tile = this.world.getTile(row, col)
        if (!tile) {
          continue
        }

        const { x, y } = gridToScreen(row, col, originX, originY)
        const visible = visibility.isVisible(row, col)
        const explored = visibility.isExplored(row, col)

        if (!visible && visibility.hasFog && !explored) {
          this.drawFogTile(x, y)
          continue
        }

        // Walls are drawn with height; all other tiles are flat diamonds.
        if (tile.terrain === 'wall') {
          this.drawWallTile(x, y)
        } else {
          const color = TERRAIN_COLORS[tile.terrain]
          this.graphics.fillStyle(color, 1)
          this.graphics.lineStyle(1, 0x1f2937, 0.45)
          this.graphics.beginPath()
          this.graphics.moveTo(x, y)
          this.graphics.lineTo(x + TILE_W / 2, y + TILE_H / 2)
          this.graphics.lineTo(x, y + TILE_H)
          this.graphics.lineTo(x - TILE_W / 2, y + TILE_H / 2)
          this.graphics.closePath()
          this.graphics.fillPath()
          this.graphics.strokePath()
        }

        // Explored-but-not-visible tiles get a dim overlay.
        if (!visible && visibility.hasFog && explored) {
          this.drawExploredTile(x, y)
        }
      }
    }
  }

  // Highlight the player's adjacent passable tiles for quick movement cues.
  private drawMoveHints(visibility: VisibilityState): void {
    const player = this.getEntities().find((entity) => entity.type === 'player')
    if (!player) {
      return
    }

    const { originX, originY } = this.getOrigin()
    const pulse = this.getPulse(0.4, 0.9, 500)
    const hints = this.getCardinalNeighbors(player.position.row, player.position.col)

    for (const hint of hints) {
      if (!visibility.isVisible(hint.row, hint.col)) {
        continue
      }

      const tile = this.world.getTile(hint.row, hint.col)
      if (!tile || !tile.passable) {
        continue
      }

      const { x, y } = gridToScreen(hint.row, hint.col, originX, originY)
      const hintColor = this.getContrastColor(TERRAIN_COLORS[tile.terrain])

      // Pulse the outline to indicate selectable movement.
      this.graphics.lineStyle(2, hintColor, pulse)
      this.graphics.fillStyle(hintColor, pulse * 0.35)
      this.graphics.beginPath()
      this.graphics.moveTo(x, y)
      this.graphics.lineTo(x + TILE_W / 2, y + TILE_H / 2)
      this.graphics.lineTo(x, y + TILE_H)
      this.graphics.lineTo(x - TILE_W / 2, y + TILE_H / 2)
      this.graphics.closePath()
      this.graphics.strokePath()
      this.graphics.fillCircle(x, y + TILE_H / 2, 3)
    }
  }

  // Draw a hover outline for the tile under the cursor when visible.
  private drawHover(visibility: VisibilityState): void {
    const pointer = this.graphics.scene.input.activePointer
    if (!pointer) {
      return
    }

    const { originX, originY } = this.getOrigin()
    const { row, col } = screenToGrid(pointer.worldX, pointer.worldY, originX, originY)
    const tile = this.world.getTile(row, col)
    if (!tile) {
      return
    }

    if (!visibility.isVisible(row, col)) {
      return
    }

    const hoveredEntity = this.getEntities().find(
      (entity) => entity.position.row === row && entity.position.col === col,
    )

    if (!tile.passable && !hoveredEntity) {
      return
    }

    const { x, y } = gridToScreen(row, col, originX, originY)

    this.graphics.lineStyle(2, 0x38bdf8, 0.9)
    this.graphics.beginPath()
    this.graphics.moveTo(x, y)
    this.graphics.lineTo(x + TILE_W / 2, y + TILE_H / 2)
    this.graphics.lineTo(x, y + TILE_H)
    this.graphics.lineTo(x - TILE_W / 2, y + TILE_H / 2)
    this.graphics.closePath()
    this.graphics.strokePath()

    if (hoveredEntity) {
      const entityY = y + TILE_H / 2 - ENTITY_Y_OFFSET
      this.graphics.lineStyle(2, 0xffffff, 0.95)
      this.graphics.strokeCircle(x, entityY, ENTITY_RADIUS + 5)
    }
  }

  // Draw entities after tiles so they sit "on top" visually.
  private drawEntities(visibility: VisibilityState): void {
    const { originX, originY } = this.getOrigin()
    const entities = [...this.getEntities()].sort(
      (a, b) => a.position.row + a.position.col - (b.position.row + b.position.col),
    )
    const pulse = this.getPulse(0.4, 0.9, 600)

    for (const entity of entities) {
      const { row, col } = entity.position
      if (!visibility.isVisible(row, col)) {
        continue
      }

      const { x, y } = gridToScreen(row, col, originX, originY)
      const color = ENTITY_COLORS[entity.type] ?? 0xffffff
      const entityY = y + TILE_H / 2 - ENTITY_Y_OFFSET

      this.graphics.fillStyle(color, 1)
      this.graphics.fillCircle(x, entityY, ENTITY_RADIUS)

      this.graphics.lineStyle(2, 0xffffff, 0.9)
      this.graphics.strokeCircle(x, entityY, ENTITY_RADIUS)

      if (entity.type === 'enemy') {
        this.graphics.lineStyle(2, 0xffffff, pulse)
        this.graphics.strokeCircle(x, entityY, ENTITY_RADIUS + 4)
      }

      // Health bars are optional so non-combat entities stay clean.
      this.drawEntityHealth(entity, x, entityY - ENTITY_RADIUS - 10)
    }
  }

  // Simple bar that reflects current vs max health.
  private drawEntityHealth(entity: IEntity, x: number, y: number): void {
    if (entity.health === undefined || entity.maxHealth === undefined) {
      return
    }

    const ratio = entity.maxHealth > 0 ? entity.health / entity.maxHealth : 0
    const barWidth = 26
    const barHeight = 4
    const filledWidth = Math.max(0, Math.min(barWidth, barWidth * ratio))
    const color = this.lerpColor(0xef4444, 0x22c55e, ratio)

    this.graphics.fillStyle(0x111827, 0.85)
    this.graphics.fillRect(x - barWidth / 2, y, barWidth, barHeight)
    this.graphics.fillStyle(color, 1)
    this.graphics.fillRect(x - barWidth / 2, y, filledWidth, barHeight)
    this.graphics.lineStyle(1, 0x000000, 0.6)
    this.graphics.strokeRect(x - barWidth / 2, y, barWidth, barHeight)
  }

  // Info panel shows player stats; visible when data is provided.
  private drawInfoPanel(): void {
    const player = this.getEntities().find(
      (entity) => entity.type === 'player',
    ) as EntityWithInfoPanel | undefined
    const infoPanel = player?.infoPanel

    if (!player || !infoPanel || infoPanel.stats.length === 0) {
      this.setInfoPanelVisibility(false)
      this.setInfoButtonVisibility(false)
      return
    }

    const showPanel = this.infoPanelVisible && infoPanel.visible !== false
    this.ensureInfoPanelControls()
    this.setInfoButtonVisibility(!showPanel)

    if (!showPanel) {
      this.setInfoPanelVisibility(false)
      this.drawInfoButton()
      return
    }

    this.setInfoPanelVisibility(true)

    const camera = this.graphics.scene.cameras.main
    const rowCount = infoPanel.stats.length + (infoPanel.footer ? 1 : 0)
    const panelHeight =
      INFO_PANEL_PADDING * 2 + INFO_PANEL_TITLE_HEIGHT + rowCount * INFO_PANEL_ROW_HEIGHT
    const { height } = this.getViewportSize()
    const panelX = camera.scrollX + INFO_PANEL_MARGIN
    const panelY = camera.scrollY + height - INFO_PANEL_MARGIN - panelHeight

    this.graphics.fillStyle(0x0b1120, 0.82)
    this.graphics.fillRect(panelX, panelY, INFO_PANEL_WIDTH, panelHeight)
    this.graphics.lineStyle(1, 0xffffff, 0.25)
    this.graphics.strokeRect(panelX, panelY, INFO_PANEL_WIDTH, panelHeight)

    this.drawInfoPanelClose(panelX, panelY)

    this.graphics.lineStyle(1, 0xffffff, 0.12)
    this.graphics.lineBetween(
      panelX + INFO_PANEL_PADDING,
      panelY + INFO_PANEL_PADDING + INFO_PANEL_TITLE_HEIGHT - 4,
      panelX + INFO_PANEL_WIDTH - INFO_PANEL_PADDING,
      panelY + INFO_PANEL_PADDING + INFO_PANEL_TITLE_HEIGHT - 4,
    )

    this.ensureInfoPanelText(infoPanel.stats.length, Boolean(infoPanel.footer))
    this.positionInfoPanelControls(panelX, panelY)

    if (this.infoPanelTitle) {
      this.infoPanelTitle.setText(infoPanel.title || 'Status')
      this.infoPanelTitle.setPosition(panelX + INFO_PANEL_PADDING, panelY + INFO_PANEL_PADDING - 2)
    }

    let rowY = panelY + INFO_PANEL_PADDING + INFO_PANEL_TITLE_HEIGHT

    infoPanel.stats.forEach((stat, index) => {
      const text = this.infoPanelLines[index]
      if (!text) {
        return
      }

      const value = typeof stat.value === 'function' ? stat.value() : stat.value
      text.setText(`${stat.label}: ${value}`)
      text.setPosition(panelX + INFO_PANEL_PADDING, rowY)
      text.setVisible(true)

      if (stat.label === 'Health') {
        this.drawInfoPanelHealthBar(player, panelX, rowY)
      }

      rowY += INFO_PANEL_ROW_HEIGHT
    })

    for (let index = infoPanel.stats.length; index < this.infoPanelLines.length; index += 1) {
      this.infoPanelLines[index].setVisible(false)
    }

    if (this.infoPanelFooter) {
      if (infoPanel.footer) {
        this.infoPanelFooter.setText(infoPanel.footer)
        this.infoPanelFooter.setPosition(panelX + INFO_PANEL_PADDING, rowY)
        this.infoPanelFooter.setVisible(true)
      } else {
        this.infoPanelFooter.setVisible(false)
      }
    }
  }

  // Mini-map shows the world overview anchored to the camera.
  private drawMiniMap(visibility: VisibilityState): void {
    const { width } = this.getViewportSize()
    const camera = this.graphics.scene.cameras.main
    const tileSize = Math.min(MINI_MAP_SIZE / this.world.cols, MINI_MAP_SIZE / this.world.rows)
    const mapWidth = this.world.cols * tileSize
    const mapHeight = this.world.rows * tileSize
    const mapX = camera.scrollX + width - HUD_MARGIN - mapWidth
    const mapY = camera.scrollY + HUD_MARGIN

    this.graphics.fillStyle(0x0f172a, 0.7)
    this.graphics.fillRect(
      mapX - MINI_MAP_PADDING,
      mapY - MINI_MAP_PADDING,
      mapWidth + MINI_MAP_PADDING * 2,
      mapHeight + MINI_MAP_PADDING * 2,
    )
    this.graphics.lineStyle(1, 0xffffff, 0.35)
    this.graphics.strokeRect(
      mapX - MINI_MAP_PADDING,
      mapY - MINI_MAP_PADDING,
      mapWidth + MINI_MAP_PADDING * 2,
      mapHeight + MINI_MAP_PADDING * 2,
    )

    for (let row = 0; row < this.world.rows; row += 1) {
      for (let col = 0; col < this.world.cols; col += 1) {
        const tile = this.world.getTile(row, col)
        if (!tile) {
          continue
        }

        const tileX = mapX + col * tileSize
        const tileY = mapY + row * tileSize
        const visible = visibility.isVisible(row, col)
        const explored = visibility.isExplored(row, col)

        let color = TERRAIN_COLORS[tile.terrain]
        let alpha = 1

        if (visibility.hasFog && !explored && !visible) {
          color = FOG_COLOR
          alpha = FOG_ALPHA
        } else if (visibility.hasFog && explored && !visible) {
          // Keep terrain color but dim it to match explored state.
          alpha = 0.35
        }

        this.graphics.fillStyle(color, alpha)
        this.graphics.fillRect(tileX, tileY, tileSize, tileSize)
      }
    }

    const entitySize = Math.max(2, Math.floor(tileSize * 0.5))
    for (const entity of this.getEntities()) {
      const { row, col } = entity.position
      if (visibility.hasFog && !visibility.isExplored(row, col)) {
        continue
      }

      const color = ENTITY_COLORS[entity.type] ?? 0xffffff
      const x = mapX + col * tileSize + tileSize / 2
      const y = mapY + row * tileSize + tileSize / 2

      this.graphics.fillStyle(color, 1)
      this.graphics.fillCircle(x, y, entitySize / 2)
    }
  }

  // Draw a faux-3D wall block to make obstacles feel taller.
  private drawWallTile(x: number, y: number): void {
    const top = { x, y: y - WALL_HEIGHT }
    const right = { x: x + TILE_W / 2, y: y + TILE_H / 2 - WALL_HEIGHT }
    const bottom = { x, y: y + TILE_H - WALL_HEIGHT }
    const left = { x: x - TILE_W / 2, y: y + TILE_H / 2 - WALL_HEIGHT }

    const baseRight = { x: x + TILE_W / 2, y: y + TILE_H / 2 }
    const baseBottom = { x, y: y + TILE_H }
    const baseLeft = { x: x - TILE_W / 2, y: y + TILE_H / 2 }

    this.graphics.fillStyle(WALL_COLORS.left, 1)
    this.graphics.beginPath()
    this.graphics.moveTo(left.x, left.y)
    this.graphics.lineTo(bottom.x, bottom.y)
    this.graphics.lineTo(baseBottom.x, baseBottom.y)
    this.graphics.lineTo(baseLeft.x, baseLeft.y)
    this.graphics.closePath()
    this.graphics.fillPath()

    this.graphics.fillStyle(WALL_COLORS.right, 1)
    this.graphics.beginPath()
    this.graphics.moveTo(right.x, right.y)
    this.graphics.lineTo(baseRight.x, baseRight.y)
    this.graphics.lineTo(baseBottom.x, baseBottom.y)
    this.graphics.lineTo(bottom.x, bottom.y)
    this.graphics.closePath()
    this.graphics.fillPath()

    this.graphics.fillStyle(WALL_COLORS.top, 1)
    this.graphics.beginPath()
    this.graphics.moveTo(top.x, top.y)
    this.graphics.lineTo(right.x, right.y)
    this.graphics.lineTo(bottom.x, bottom.y)
    this.graphics.lineTo(left.x, left.y)
    this.graphics.closePath()
    this.graphics.fillPath()

    this.graphics.lineStyle(2, WALL_COLORS.outline, 0.9)
    this.graphics.beginPath()
    this.graphics.moveTo(top.x, top.y)
    this.graphics.lineTo(right.x, right.y)
    this.graphics.lineTo(bottom.x, bottom.y)
    this.graphics.lineTo(left.x, left.y)
    this.graphics.closePath()
    this.graphics.strokePath()
  }

  // Full fog tile for unexplored, unseen areas.
  private drawFogTile(x: number, y: number): void {
    this.graphics.fillStyle(FOG_COLOR, FOG_ALPHA)
    this.graphics.beginPath()
    this.graphics.moveTo(x, y)
    this.graphics.lineTo(x + TILE_W / 2, y + TILE_H / 2)
    this.graphics.lineTo(x, y + TILE_H)
    this.graphics.lineTo(x - TILE_W / 2, y + TILE_H / 2)
    this.graphics.closePath()
    this.graphics.fillPath()
  }

  // Dimmed overlay for explored but currently unseen tiles.
  private drawExploredTile(x: number, y: number): void {
    this.graphics.fillStyle(FOG_EXPLORED_COLOR, FOG_EXPLORED_ALPHA)
    this.graphics.beginPath()
    this.graphics.moveTo(x, y)
    this.graphics.lineTo(x + TILE_W / 2, y + TILE_H / 2)
    this.graphics.lineTo(x, y + TILE_H)
    this.graphics.lineTo(x - TILE_W / 2, y + TILE_H / 2)
    this.graphics.closePath()
    this.graphics.fillPath()
  }

  // Cardinal neighbors used for movement hint visualization.
  private getCardinalNeighbors(row: number, col: number): { row: number; col: number }[] {
    return [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ]
  }

  // Pulse helper for small UI animations.
  private getPulse(min: number, max: number, speedMs: number): number {
    const time = performance.now()
    const normalized = (Math.sin(time / speedMs) + 1) / 2
    return min + (max - min) * normalized
  }

  // Linear interpolate between two hex colors.
  private lerpColor(start: number, end: number, t: number): number {
    const clamped = Math.max(0, Math.min(1, t))
    const sr = (start >> 16) & 0xff
    const sg = (start >> 8) & 0xff
    const sb = start & 0xff
    const er = (end >> 16) & 0xff
    const eg = (end >> 8) & 0xff
    const eb = end & 0xff

    const rr = Math.round(sr + (er - sr) * clamped)
    const rg = Math.round(sg + (eg - sg) * clamped)
    const rb = Math.round(sb + (eb - sb) * clamped)

    return (rr << 16) + (rg << 8) + rb
  }

  // Compute a readable overlay color for the given terrain.
  private getContrastColor(color: number): number {
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    const b = color & 0xff
    const ir = 0xff - r
    const ig = 0xff - g
    const ib = 0xff - b

    return (ir << 16) + (ig << 8) + ib
  }

  // Center the grid in the current viewport.
  private getOrigin(): { originX: number; originY: number } {
    const { width, height } = this.getViewportSize()
    const totalHeight = (this.world.rows + this.world.cols) * (TILE_H / 2)

    return {
      originX: width / 2,
      originY: (height - totalHeight) / 2,
    }
  }

  // Respect Phaser's scale values but fall back to constructor defaults.
  private getViewportSize(): { width: number; height: number } {
    const { width, height } = this.graphics.scene.scale

    return {
      width: width || this.screenWidth,
      height: height || this.screenHeight,
    }
  }

  // Build a visibility state from the player's position.
  private getVisibility(): VisibilityState {
    const player = this.getEntities().find((entity) => entity.type === 'player')
    if (!player) {
      return {
        hasFog: false,
        isVisible: () => true,
        isExplored: () => false,
      }
    }

    const visibleTiles = computeVisibleTiles(this.world, player.position, DEFAULT_VISIBILITY_SIZE)
    this.updateExplored(visibleTiles)

    return {
      hasFog: true,
      isVisible: (row: number, col: number) => isTileVisible(visibleTiles, row, col),
      isExplored: (row: number, col: number) => this.exploredTiles.has(tileKey(row, col)),
    }
  }

  // Track explored tiles so fog fades but does not fully reset.
  private updateExplored(visibleTiles: Set<string>): void {
    visibleTiles.forEach((key) => this.exploredTiles.add(key))
  }

  private drawInfoPanelClose(panelX: number, panelY: number): void {
    const closeX = panelX + INFO_PANEL_WIDTH - INFO_PANEL_PADDING - INFO_PANEL_CLOSE_SIZE
    const closeY = panelY + INFO_PANEL_PADDING - 4

    this.graphics.fillStyle(0x111827, 0.95)
    this.graphics.fillRect(closeX, closeY, INFO_PANEL_CLOSE_SIZE, INFO_PANEL_CLOSE_SIZE)
    this.graphics.lineStyle(1, 0xffffff, 0.35)
    this.graphics.strokeRect(closeX, closeY, INFO_PANEL_CLOSE_SIZE, INFO_PANEL_CLOSE_SIZE)
  }

  private drawInfoButton(): void {
    const { height } = this.getViewportSize()
    const camera = this.graphics.scene.cameras.main
    const buttonX = camera.scrollX + INFO_PANEL_MARGIN
    const buttonY = camera.scrollY + height - INFO_PANEL_MARGIN - INFO_PANEL_ICON_SIZE

    this.graphics.fillStyle(0x0b1120, 0.82)
    this.graphics.fillRect(buttonX, buttonY, INFO_PANEL_ICON_SIZE, INFO_PANEL_ICON_SIZE)
    this.graphics.lineStyle(1, 0xffffff, 0.35)
    this.graphics.strokeRect(buttonX, buttonY, INFO_PANEL_ICON_SIZE, INFO_PANEL_ICON_SIZE)

    this.positionInfoButton(buttonX, buttonY)
  }

  private drawInfoPanelHealthBar(player: IEntity, panelX: number, rowY: number): void {
    if (player.health === undefined || player.maxHealth === undefined) {
      return
    }

    const ratio = player.maxHealth > 0 ? player.health / player.maxHealth : 0
    const filledWidth = Math.max(0, Math.min(INFO_PANEL_HEALTH_BAR_WIDTH, INFO_PANEL_HEALTH_BAR_WIDTH * ratio))
    const barX =
      panelX + INFO_PANEL_WIDTH - INFO_PANEL_PADDING - INFO_PANEL_HEALTH_BAR_WIDTH
    const barY = rowY + 5

    this.graphics.fillStyle(0x0f172a, 0.9)
    this.graphics.fillRect(barX, barY, INFO_PANEL_HEALTH_BAR_WIDTH, INFO_PANEL_HEALTH_BAR_HEIGHT)
    this.graphics.fillStyle(0x22c55e, 1)
    this.graphics.fillRect(barX, barY, filledWidth, INFO_PANEL_HEALTH_BAR_HEIGHT)
    this.graphics.lineStyle(1, 0x000000, 0.5)
    this.graphics.strokeRect(barX, barY, INFO_PANEL_HEALTH_BAR_WIDTH, INFO_PANEL_HEALTH_BAR_HEIGHT)
  }

  private ensureInfoPanelText(statCount: number, hasFooter: boolean): void {
    const scene = this.graphics.scene

    if (!this.infoPanelTitle) {
      this.infoPanelTitle = scene.add
        .text(0, 0, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${INFO_PANEL_TITLE_SIZE}px`,
          color: '#f8fafc',
        })
        .setDepth(INFO_PANEL_DEPTH)
    }

    while (this.infoPanelLines.length < statCount) {
      const text = scene.add
        .text(0, 0, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${INFO_PANEL_TEXT_SIZE}px`,
          color: '#e2e8f0',
        })
        .setDepth(INFO_PANEL_DEPTH)
      this.infoPanelLines.push(text)
    }

    if (hasFooter && !this.infoPanelFooter) {
      this.infoPanelFooter = scene.add
        .text(0, 0, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${INFO_PANEL_FOOTER_SIZE}px`,
          color: '#94a3b8',
        })
        .setDepth(INFO_PANEL_DEPTH)
    }
  }

  private ensureInfoPanelControls(): void {
    const scene = this.graphics.scene

    if (!this.infoButtonZone) {
      this.infoButtonZone = scene.add
        .zone(0, 0, INFO_PANEL_ICON_SIZE, INFO_PANEL_ICON_SIZE)
        .setOrigin(0, 0)
        .setDepth(INFO_PANEL_DEPTH)
        .setInteractive({ useHandCursor: true })
      this.infoButtonZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation()
        this.infoPanelVisible = true
      })
    }

    if (!this.infoButtonText) {
      this.infoButtonText = scene.add
        .text(0, 0, 'i', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '14px',
          color: '#f8fafc',
        })
        .setDepth(INFO_PANEL_DEPTH + 1)
    }

    if (!this.closeButtonZone) {
      this.closeButtonZone = scene.add
        .zone(0, 0, INFO_PANEL_CLOSE_SIZE, INFO_PANEL_CLOSE_SIZE)
        .setOrigin(0, 0)
        .setDepth(INFO_PANEL_DEPTH)
        .setInteractive({ useHandCursor: true })
      this.closeButtonZone.on('pointerup', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation()
        this.infoPanelVisible = false
      })
    }

    if (!this.closeButtonText) {
      this.closeButtonText = scene.add
        .text(0, 0, 'x', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          color: '#e2e8f0',
        })
        .setDepth(INFO_PANEL_DEPTH + 1)
    }
  }

  private setInfoPanelVisibility(visible: boolean): void {
    this.infoPanelTitle?.setVisible(visible)
    this.infoPanelLines.forEach((line) => line.setVisible(visible))
    this.infoPanelFooter?.setVisible(visible)
    this.closeButtonText?.setVisible(visible)
    const closeZone = this.closeButtonZone
    if (closeZone) {
      closeZone.setVisible(visible)
      closeZone.setActive(visible)
    }
  }

  private setInfoButtonVisibility(visible: boolean): void {
    this.infoButtonText?.setVisible(visible)
    const infoZone = this.infoButtonZone
    if (infoZone) {
      infoZone.setVisible(visible)
      infoZone.setActive(visible)
    }
  }

  private positionInfoPanelControls(panelX: number, panelY: number): void {
    const closeX = panelX + INFO_PANEL_WIDTH - INFO_PANEL_PADDING - INFO_PANEL_CLOSE_SIZE
    const closeY = panelY + INFO_PANEL_PADDING - 4

    this.closeButtonZone?.setPosition(closeX, closeY)
    this.closeButtonZone?.setSize(INFO_PANEL_CLOSE_SIZE, INFO_PANEL_CLOSE_SIZE)
    if (this.closeButtonText) {
      this.closeButtonText.setText('x')
      this.closeButtonText.setPosition(closeX + 4, closeY - 1)
    }

  }

  private positionInfoButton(buttonX: number, buttonY: number): void {
    this.infoButtonZone?.setPosition(buttonX, buttonY)
    this.infoButtonZone?.setSize(INFO_PANEL_ICON_SIZE, INFO_PANEL_ICON_SIZE)
    if (this.infoButtonText) {
      this.infoButtonText.setPosition(buttonX + 7, buttonY + 3)
    }
  }

}

type VisibilityState = {
  hasFog: boolean
  isVisible: (row: number, col: number) => boolean
  isExplored: (row: number, col: number) => boolean
}

type InfoPanelStat = {
  label: string
  value: string | number | (() => string | number)
}

type InfoPanelData = {
  title: string
  stats: InfoPanelStat[]
  footer?: string
  visible?: boolean
}

type EntityWithInfoPanel = IEntity & {
  infoPanel?: InfoPanelData
}

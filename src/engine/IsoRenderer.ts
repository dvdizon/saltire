import Phaser from 'phaser'
import { IEntity, IWorld, TerrainType } from './types'
import { computeVisibleTiles, DEFAULT_VISIBILITY_SIZE, isTileVisible, tileKey } from './visibility'

export const TILE_W = 64
export const TILE_H = 32

const ENTITY_RADIUS = 10
const ENTITY_Y_OFFSET = TILE_H * 0.3
const WALL_HEIGHT = TILE_H
const FOG_COLOR = 0x0b1120
const FOG_ALPHA = 0.78
const FOG_EXPLORED_COLOR = 0x0f172a
const FOG_EXPLORED_ALPHA = 0.45

const DEFAULT_TERRAIN_COLORS: Record<TerrainType, number> = {
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
  colony: 0x6B7280,
  enemy: 0xF97316,
  npc: 0x4CC9F0,
  'planet-easy': 0x22C55E,
  'planet-medium': 0x2DD4BF,
  'planet-hard': 0x8B8F97,
  'planet-rare': 0xA855F7,
}

export type IsoVisibilityState = {
  hasFog: boolean
  isVisible: (row: number, col: number) => boolean
  isExplored: (row: number, col: number) => boolean
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

// Responsible for drawing the world and entities each frame.
export class IsoRenderer {
  private exploredTiles = new Set<string>()
  private terrainColors: Record<TerrainType, number>

  // Graphics is reused; world/entities are pulled live every render.
  constructor(
    private graphics: Phaser.GameObjects.Graphics,
    private world: IWorld,
    private getEntities: () => IEntity[],
    private screenWidth: number,
    private screenHeight: number,
    terrainColors?: Partial<Record<TerrainType, number>>,
    private overlayRenderer?: (graphics: Phaser.GameObjects.Graphics) => void,
    private shouldRenderEntity?: (entity: IEntity) => boolean,
    private visibilityProvider?: () => IsoVisibilityState,
  ) {
    this.terrainColors = { ...DEFAULT_TERRAIN_COLORS, ...terrainColors }
    // Set graphics depth below UI panels (which use depth 1000)
    this.graphics.setDepth(0)
  }

  // Clear and redraw everything in a consistent order each frame.
  render(): void {
    this.graphics.clear()
    const visibility = this.getVisibility()
    this.drawTiles(visibility)
    this.drawHover(visibility)
    this.drawMoveHints(visibility)
    if (this.overlayRenderer) {
      this.overlayRenderer(this.graphics)
    }
    this.drawEntities(visibility)
  }

  /** @internal Draw terrain tiles with fog-of-war overlays. */
  private drawTiles(visibility: IsoVisibilityState): void {
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
          const color = this.terrainColors[tile.terrain]
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

  /** @internal No movement hints for stationary colony gameplay. */
  private drawMoveHints(visibility: IsoVisibilityState): void {
    void visibility
  }

  /** @internal Draw a hover outline for the tile under the cursor when visible. */
  private drawHover(visibility: IsoVisibilityState): void {
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

  /** @internal Draw entities after tiles so they sit "on top" visually. */
  private drawEntities(visibility: IsoVisibilityState): void {
    const { originX, originY } = this.getOrigin()
    const entities = [...this.getEntities()].sort(
      (a, b) => a.position.row + a.position.col - (b.position.row + b.position.col),
    )
    const pulse = this.getPulse(0.4, 0.9, 600)

    for (const entity of entities) {
      if (this.shouldRenderEntity && !this.shouldRenderEntity(entity)) {
        continue
      }

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

  /** @internal Simple bar that reflects current vs max health. */
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


  /** @internal Draw a faux-3D wall block to make obstacles feel taller. */
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

  /** @internal Full fog tile for unexplored, unseen areas. */
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

  /** @internal Dimmed overlay for explored but currently unseen tiles. */
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


  /** @internal Pulse helper for small UI animations. */
  private getPulse(min: number, max: number, speedMs: number): number {
    const time = performance.now()
    const normalized = (Math.sin(time / speedMs) + 1) / 2
    return min + (max - min) * normalized
  }

  /** @internal Linear interpolate between two hex colors. */
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


  /** @internal Center the grid in the current viewport. */
  private getOrigin(): { originX: number; originY: number } {
    const { width, height } = this.getViewportSize()
    const totalHeight = (this.world.rows + this.world.cols) * (TILE_H / 2)

    return {
      originX: width / 2,
      originY: (height - totalHeight) / 2,
    }
  }

  /** @internal Respect Phaser's scale values but fall back to constructor defaults. */
  private getViewportSize(): { width: number; height: number } {
    const { width, height } = this.graphics.scene.scale

    return {
      width: width || this.screenWidth,
      height: height || this.screenHeight,
    }
  }

  /** @internal Build a visibility state from the player's position. */
  private getVisibility(): IsoVisibilityState {
    const provided = this.visibilityProvider?.()
    if (provided) {
      return provided
    }

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

  /** @internal Track explored tiles so fog fades but does not fully reset. */
  private updateExplored(visibleTiles: Set<string>): void {
    visibleTiles.forEach((key) => this.exploredTiles.add(key))
  }
}

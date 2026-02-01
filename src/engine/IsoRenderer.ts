import Phaser from 'phaser'
import { IEntity, IWorld, TerrainType } from '../types'

export const TILE_W = 64
export const TILE_H = 32

const ENTITY_RADIUS = 10
const ENTITY_Y_OFFSET = TILE_H * 0.3
const HUD_MARGIN = 16
const HUD_WIDTH = 160
const HUD_HEIGHT = 12

const TERRAIN_COLORS: Record<TerrainType, number> = {
  grass: 0x5cb85c,
  dirt: 0xb37b4d,
  sand: 0xf4d35e,
  water: 0x4d8dd6,
  wall: 0x3f3f3f,
}

const ENTITY_COLORS: Record<string, number> = {
  player: 0x3b82f6,
  enemy: 0xef4444,
  npc: 0xfbbf24,
}

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

export class IsoRenderer {
  constructor(
    private graphics: Phaser.GameObjects.Graphics,
    private world: IWorld,
    private getEntities: () => IEntity[],
    private screenWidth: number,
    private screenHeight: number,
  ) {}

  render(): void {
    this.graphics.clear()
    this.drawTiles()
    this.drawHover()
    this.drawMoveHints()
    this.drawEntities()
    this.drawHud()
  }

  private drawTiles(): void {
    const { originX, originY } = this.getOrigin()

    for (let row = 0; row < this.world.rows; row += 1) {
      for (let col = 0; col < this.world.cols; col += 1) {
        const tile = this.world.getTile(row, col)
        if (!tile) {
          continue
        }

        const { x, y } = gridToScreen(row, col, originX, originY)
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
    }
  }

  private drawMoveHints(): void {
    const player = this.getEntities().find((entity) => entity.type === 'player')
    if (!player) {
      return
    }

    const { originX, originY } = this.getOrigin()
    const pulse = this.getPulse(0.4, 0.9, 500)
    const hints = this.getCardinalNeighbors(player.position.row, player.position.col)

    for (const hint of hints) {
      const tile = this.world.getTile(hint.row, hint.col)
      if (!tile || !tile.passable) {
        continue
      }

      const { x, y } = gridToScreen(hint.row, hint.col, originX, originY)
      const hintColor = this.getContrastColor(TERRAIN_COLORS[tile.terrain])

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

  private drawHover(): void {
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

  private drawEntities(): void {
    const { originX, originY } = this.getOrigin()
    const entities = [...this.getEntities()].sort(
      (a, b) => a.position.row + a.position.col - (b.position.row + b.position.col),
    )
    const pulse = this.getPulse(0.4, 0.9, 600)

    for (const entity of entities) {
      const { row, col } = entity.position
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

      this.drawEntityHealth(entity, x, entityY - ENTITY_RADIUS - 10)
    }
  }

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

  private drawHud(): void {
    const player = this.getEntities().find((entity) => entity.type === 'player')
    if (!player || player.health === undefined || player.maxHealth === undefined) {
      return
    }

    const ratio = player.maxHealth > 0 ? player.health / player.maxHealth : 0
    const filledWidth = Math.max(0, Math.min(HUD_WIDTH, HUD_WIDTH * ratio))
    const color = this.lerpColor(0xef4444, 0x22c55e, ratio)

    this.graphics.fillStyle(0x0f172a, 0.7)
    this.graphics.fillRect(HUD_MARGIN - 8, HUD_MARGIN - 8, HUD_WIDTH + 16, HUD_HEIGHT + 16)
    this.graphics.lineStyle(1, 0xffffff, 0.4)
    this.graphics.strokeRect(HUD_MARGIN - 8, HUD_MARGIN - 8, HUD_WIDTH + 16, HUD_HEIGHT + 16)

    this.graphics.fillStyle(0x111827, 0.95)
    this.graphics.fillRect(HUD_MARGIN, HUD_MARGIN, HUD_WIDTH, HUD_HEIGHT)
    this.graphics.fillStyle(color, 1)
    this.graphics.fillRect(HUD_MARGIN, HUD_MARGIN, filledWidth, HUD_HEIGHT)
    this.graphics.lineStyle(1, 0x000000, 0.6)
    this.graphics.strokeRect(HUD_MARGIN, HUD_MARGIN, HUD_WIDTH, HUD_HEIGHT)
  }

  private getCardinalNeighbors(row: number, col: number): { row: number; col: number }[] {
    return [
      { row: row - 1, col },
      { row: row + 1, col },
      { row, col: col - 1 },
      { row, col: col + 1 },
    ]
  }

  private getPulse(min: number, max: number, speedMs: number): number {
    const time = performance.now()
    const normalized = (Math.sin(time / speedMs) + 1) / 2
    return min + (max - min) * normalized
  }

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

  private getContrastColor(color: number): number {
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    const b = color & 0xff
    const ir = 0xff - r
    const ig = 0xff - g
    const ib = 0xff - b

    return (ir << 16) + (ig << 8) + ib
  }

  private getOrigin(): { originX: number; originY: number } {
    const { width, height } = this.getViewportSize()
    const totalHeight = (this.world.rows + this.world.cols) * (TILE_H / 2)

    return {
      originX: width / 2,
      originY: (height - totalHeight) / 2,
    }
  }

  private getViewportSize(): { width: number; height: number } {
    const { width, height } = this.graphics.scene.scale

    return {
      width: width || this.screenWidth,
      height: height || this.screenHeight,
    }
  }
}

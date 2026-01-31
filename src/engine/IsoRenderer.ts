import Phaser from 'phaser'
import { IEntity, IWorld, TerrainType } from '../types'

const DEFAULT_TILE_WIDTH = 64
const DEFAULT_TILE_HEIGHT = 32

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
    this.drawEntities()
  }

  private drawTiles(): void {
    const { originX, originY } = this.getOrigin()

    for (let row = 0; row < this.world.rows; row += 1) {
      for (let col = 0; col < this.world.cols; col += 1) {
        const tile = this.world.getTile(row, col)
        if (!tile) {
          continue
        }

        const { x, y } = this.gridToScreen(row, col, originX, originY)
        const color = TERRAIN_COLORS[tile.terrain]

        this.graphics.fillStyle(color, 1)
        this.graphics.lineStyle(1, 0x1f2937, 0.4)
        this.graphics.beginPath()
        this.graphics.moveTo(x, y)
        this.graphics.lineTo(x + DEFAULT_TILE_WIDTH / 2, y + DEFAULT_TILE_HEIGHT / 2)
        this.graphics.lineTo(x, y + DEFAULT_TILE_HEIGHT)
        this.graphics.lineTo(x - DEFAULT_TILE_WIDTH / 2, y + DEFAULT_TILE_HEIGHT / 2)
        this.graphics.closePath()
        this.graphics.fillPath()
        this.graphics.strokePath()
      }
    }
  }

  private drawEntities(): void {
    const { originX, originY } = this.getOrigin()

    this.getEntities().forEach((entity) => {
      const { row, col } = entity.position
      const { x, y } = this.gridToScreen(row, col, originX, originY)
      const color = ENTITY_COLORS[entity.type] ?? 0xffffff

      this.graphics.fillStyle(color, 1)
      this.graphics.fillCircle(x, y + DEFAULT_TILE_HEIGHT / 2, DEFAULT_TILE_HEIGHT / 2.2)
    })
  }

  private gridToScreen(
    row: number,
    col: number,
    originX: number,
    originY: number,
  ): { x: number; y: number } {
    return {
      x: (col - row) * (DEFAULT_TILE_WIDTH / 2) + originX,
      y: (col + row) * (DEFAULT_TILE_HEIGHT / 2) + originY,
    }
  }

  private getOrigin(): { originX: number; originY: number } {
    const totalHeight = (this.world.rows + this.world.cols) * (DEFAULT_TILE_HEIGHT / 2)

    return {
      originX: this.screenWidth / 2,
      originY: (this.screenHeight - totalHeight) / 2,
    }
  }
}

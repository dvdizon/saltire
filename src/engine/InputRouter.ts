import Phaser from 'phaser'
import { IEntity, IInputRouter, IWorld, TileSelectedCallback, EntityTappedCallback } from '../types'

const DEFAULT_TILE_WIDTH = 64
const DEFAULT_TILE_HEIGHT = 32

export class InputRouter implements IInputRouter {
  private tileSelectedCallbacks: TileSelectedCallback[] = []
  private entityTappedCallbacks: EntityTappedCallback[] = []

  constructor(
    private scene: Phaser.Scene,
    private world: IWorld,
    private getEntities: () => IEntity[],
  ) {
    this.scene.input.on('pointerdown', this.handlePointerDown)
  }

  onTileSelected(callback: TileSelectedCallback): void {
    this.tileSelectedCallbacks.push(callback)
  }

  onEntityTapped(callback: EntityTappedCallback): void {
    this.entityTappedCallbacks.push(callback)
  }

  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    const { width, height } = this.scene.scale
    const { originX, originY } = this.getOrigin(width, height)

    const isoX = pointer.worldX - originX
    const isoY = pointer.worldY - originY

    const row = Math.floor(isoY / DEFAULT_TILE_HEIGHT - isoX / DEFAULT_TILE_WIDTH)
    const col = Math.floor(isoY / DEFAULT_TILE_HEIGHT + isoX / DEFAULT_TILE_WIDTH)

    const tile = this.world.getTile(row, col)
    if (!tile) {
      return
    }

    const entity = this.getEntities().find(
      (candidate) => candidate.position.row === row && candidate.position.col === col,
    )

    if (entity) {
      this.entityTappedCallbacks.forEach((callback) => callback(entity))
    }

    this.tileSelectedCallbacks.forEach((callback) => callback(row, col))
  }

  private getOrigin(screenWidth: number, screenHeight: number): {
    originX: number
    originY: number
  } {
    const totalHeight = (this.world.rows + this.world.cols) * (DEFAULT_TILE_HEIGHT / 2)

    return {
      originX: screenWidth / 2,
      originY: (screenHeight - totalHeight) / 2,
    }
  }
}

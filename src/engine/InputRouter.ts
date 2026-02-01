import Phaser from 'phaser'
import { IEntity, IInputRouter, IWorld, TileSelectedCallback, EntityTappedCallback } from '../types'
import { screenToGrid, TILE_H } from './IsoRenderer'

export class InputRouter implements IInputRouter {
  private tileSelectedCallbacks: TileSelectedCallback[] = []
  private entityTappedCallbacks: EntityTappedCallback[] = []

  constructor(
    private scene: Phaser.Scene,
    private world: IWorld,
    private getEntities: () => IEntity[],
  ) {
    this.scene.input.on('pointerdown', this.handlePointerDown)
    this.scene.input.on('pointermove', this.handlePointerMove)
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
    const { row, col } = screenToGrid(pointer.worldX, pointer.worldY, originX, originY)

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

  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    const { width, height } = this.scene.scale
    const { originX, originY } = this.getOrigin(width, height)
    const { row, col } = screenToGrid(pointer.worldX, pointer.worldY, originX, originY)
    const tile = this.world.getTile(row, col)

    if (!tile) {
      this.scene.input.setDefaultCursor('default')
      return
    }

    const entity = this.getEntities().find(
      (candidate) => candidate.position.row === row && candidate.position.col === col,
    )

    if (entity || tile.passable) {
      this.scene.input.setDefaultCursor('pointer')
      return
    }

    this.scene.input.setDefaultCursor('default')
  }

  private getOrigin(screenWidth: number, screenHeight: number): {
    originX: number
    originY: number
  } {
    const totalHeight = (this.world.rows + this.world.cols) * (TILE_H / 2)

    return {
      originX: screenWidth / 2,
      originY: (screenHeight - totalHeight) / 2,
    }
  }
}

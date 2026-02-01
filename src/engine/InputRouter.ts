import Phaser from 'phaser'
import { IEntity, IInputRouter, IWorld, TileSelectedCallback, EntityTappedCallback } from '../types'
import { screenToGrid, TILE_H } from './IsoRenderer'

export class InputRouter implements IInputRouter {
  private tileSelectedCallbacks: TileSelectedCallback[] = []
  private entityTappedCallbacks: EntityTappedCallback[] = []
  private dragState: {
    startX: number
    startY: number
    lastX: number
    lastY: number
    active: boolean
  } | null = null

  constructor(
    private scene: Phaser.Scene,
    private world: IWorld,
    private getEntities: () => IEntity[],
  ) {
    this.scene.input.on('pointerdown', this.handlePointerDown)
    this.scene.input.on('pointermove', this.handlePointerMove)
    this.scene.input.on('pointerup', this.handlePointerUp)
  }

  onTileSelected(callback: TileSelectedCallback): void {
    this.tileSelectedCallbacks.push(callback)
  }

  onEntityTapped(callback: EntityTappedCallback): void {
    this.entityTappedCallbacks.push(callback)
  }

  private handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    this.dragState = {
      startX: pointer.x,
      startY: pointer.y,
      lastX: pointer.x,
      lastY: pointer.y,
      active: false,
    }
  }

  private handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
    if (this.handleDrag(pointer)) {
      return
    }

    this.updateHoverCursor(pointer)
  }

  private handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    const wasDragging = this.dragState?.active ?? false
    this.dragState = null

    if (wasDragging) {
      this.updateHoverCursor(pointer)
      return
    }

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

  private handleDrag(pointer: Phaser.Input.Pointer): boolean {
    if (!this.dragState || !pointer.isDown) {
      return false
    }

    const deltaX = pointer.x - this.dragState.startX
    const deltaY = pointer.y - this.dragState.startY
    const distance = Math.hypot(deltaX, deltaY)

    if (!this.dragState.active && distance > 6) {
      this.dragState.active = true
      this.scene.input.setDefaultCursor('grabbing')
    }

    if (!this.dragState.active) {
      return false
    }

    const moveX = pointer.x - this.dragState.lastX
    const moveY = pointer.y - this.dragState.lastY
    this.scene.cameras.main.scrollX -= moveX
    this.scene.cameras.main.scrollY -= moveY
    this.dragState.lastX = pointer.x
    this.dragState.lastY = pointer.y

    return true
  }

  private updateHoverCursor(pointer: Phaser.Input.Pointer): void {
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

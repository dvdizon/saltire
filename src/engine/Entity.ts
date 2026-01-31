import { EntityPosition, IEntity } from '../types'

export class Entity implements IEntity {
  public health?: number
  public maxHealth?: number

  constructor(
    public readonly id: string,
    public type: string,
    public position: EntityPosition,
    health?: number,
    maxHealth?: number,
  ) {
    this.health = health
    this.maxHealth = maxHealth ?? health
  }

  update(_delta: number): void {
    // Entities are updated by the game layer as needed.
  }

  destroy(): void {
    // Placeholder for cleanup hooks if needed later.
  }
}

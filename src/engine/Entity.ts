import { EntityPosition, IEntity } from '../types'

// Lightweight data holder for anything that lives on the grid.
export class Entity implements IEntity {
  public health?: number
  public maxHealth?: number

  // Health values are optional so non-combat entities stay simple.
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

  // Hook for game-layer behavior; no engine-side logic by default.
  update(_delta: number): void {
    // Entities are updated by the game layer as needed.
  }

  // Placeholder for future renderer cleanup or pooled resources.
  destroy(): void {
    // Placeholder for cleanup hooks if needed later.
  }
}

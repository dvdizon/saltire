export type TurnState = 'player' | 'enemy'

// Minimal turn state holder so GameScene can stay focused on rules.
export class TurnManager {
  private currentTurn: TurnState = 'player'

  // Expose the raw turn state for simple checks or UI hooks.
  getCurrentTurn(): TurnState {
    return this.currentTurn
  }

  // Common convenience for input gating.
  isPlayerTurn(): boolean {
    return this.currentTurn === 'player'
  }

  // Player actions always hand control to the enemy phase.
  endPlayerTurn(): void {
    this.currentTurn = 'enemy'
  }

  // Explicit calls keep the phase transitions readable in the scene.
  startEnemyTurn(): void {
    this.currentTurn = 'enemy'
  }

  // Reset back to the player after the enemy phase completes.
  startPlayerTurn(): void {
    this.currentTurn = 'player'
  }
}

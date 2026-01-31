export type TurnState = 'player' | 'enemy'

export class TurnManager {
  private currentTurn: TurnState = 'player'

  getCurrentTurn(): TurnState {
    return this.currentTurn
  }

  isPlayerTurn(): boolean {
    return this.currentTurn === 'player'
  }

  endPlayerTurn(): void {
    this.currentTurn = 'enemy'
  }

  startEnemyTurn(): void {
    this.currentTurn = 'enemy'
  }

  startPlayerTurn(): void {
    this.currentTurn = 'player'
  }
}

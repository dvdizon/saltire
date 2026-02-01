import type { IGameScene, IWorld, IInputRouter, IEntity } from '../types'
import { TurnManager } from './TurnManager'

const DEFAULT_PLAYER_HEALTH = 5
const DEFAULT_ENEMY_HEALTH = 2
const DAMAGE_PER_HIT = 1

export class GameScene implements IGameScene {
  private world: IWorld | null = null
  private inputRouter: IInputRouter | null = null
  private entities: IEntity[] = []
  private player: IEntity | null = null
  private turnManager = new TurnManager()
  private result: 'win' | 'lose' | 'playing' = 'playing'
  private skipNextTileSelect = false

  initialize(world: IWorld, inputRouter: IInputRouter, entities: IEntity[]): void {
    this.world = world
    this.inputRouter = inputRouter
    this.entities = entities
    this.player = this.entities.find((entity) => entity.type === 'player') ?? null
    this.entities.forEach((entity) => this.ensureEntityHealth(entity))

    this.inputRouter.onTileSelected((row, col) => {
      if (this.skipNextTileSelect) {
        this.skipNextTileSelect = false
        return
      }

      if (!this.turnManager.isPlayerTurn() || this.result !== 'playing') {
        return
      }

      if (!this.player) {
        return
      }

      const tile = this.world?.getTile(row, col)
      if (!tile || !tile.passable) {
        return
      }

      if (!this.isAdjacent(this.player.position.row, this.player.position.col, row, col)) {
        return
      }

      if (this.getEntityAt(row, col)) {
        return
      }

      this.player.position = { row, col }
      this.finishPlayerTurn()
    })

    this.inputRouter.onEntityTapped((entity) => {
      if (!this.turnManager.isPlayerTurn() || this.result !== 'playing') {
        return
      }

      if (!this.player || entity.type !== 'enemy') {
        return
      }

      if (!this.isAdjacent(this.player.position.row, this.player.position.col, entity.position.row, entity.position.col)) {
        return
      }

      this.skipNextTileSelect = true
      this.applyDamage(entity, DAMAGE_PER_HIT)
      if ((entity.health ?? 0) <= 0) {
        this.removeEntity(entity)
      }

      this.finishPlayerTurn()
    })
  }

  update(_delta: number): void {
    if (this.result !== 'playing') {
      return
    }

    if (this.player && (this.player.health ?? 0) <= 0) {
      this.result = 'lose'
      return
    }

    const enemies = this.getEnemies()
    if (enemies.length === 0) {
      this.result = 'win'
    }
  }

  isOver(): boolean {
    return this.result !== 'playing'
  }

  getResult(): 'win' | 'lose' | 'playing' {
    return this.result
  }

  private finishPlayerTurn(): void {
    this.turnManager.endPlayerTurn()
    this.runEnemyPhase()
    this.turnManager.startPlayerTurn()
  }

  private runEnemyPhase(): void {
    if (!this.player || !this.world) {
      return
    }

    const enemies = this.getEnemies()
    for (const enemy of enemies) {
      if (!this.player || this.result !== 'playing') {
        break
      }

      if ((enemy.health ?? 0) <= 0) {
        continue
      }

      if (this.isAdjacent(enemy.position.row, enemy.position.col, this.player.position.row, this.player.position.col)) {
        this.applyDamage(this.player, DAMAGE_PER_HIT)
        if ((this.player.health ?? 0) <= 0) {
          this.result = 'lose'
          return
        }
        continue
      }

      const nextStep = this.getNextEnemyStep(enemy.position, this.player.position)
      if (nextStep && !this.getEntityAt(nextStep.row, nextStep.col)) {
        const tile = this.world.getTile(nextStep.row, nextStep.col)
        if (tile?.passable) {
          enemy.position = { row: nextStep.row, col: nextStep.col }
        }
      }
    }

    if (this.getEnemies().length === 0) {
      this.result = 'win'
    }
  }

  private getEnemies(): IEntity[] {
    return this.entities.filter((entity) => entity.type === 'enemy' && (entity.health ?? 0) > 0)
  }

  private getEntityAt(row: number, col: number): IEntity | null {
    return this.entities.find((entity) => entity.position.row === row && entity.position.col === col) ?? null
  }

  private isAdjacent(rowA: number, colA: number, rowB: number, colB: number): boolean {
    const rowDiff = Math.abs(rowA - rowB)
    const colDiff = Math.abs(colA - colB)
    return rowDiff + colDiff === 1
  }

  private getNextEnemyStep(from: { row: number; col: number }, target: { row: number; col: number }): { row: number; col: number } | null {
    const rowDelta = target.row - from.row
    const colDelta = target.col - from.col

    const candidates: { row: number; col: number }[] = []

    if (Math.abs(rowDelta) >= Math.abs(colDelta)) {
      candidates.push({ row: from.row + Math.sign(rowDelta), col: from.col })
      if (colDelta !== 0) {
        candidates.push({ row: from.row, col: from.col + Math.sign(colDelta) })
      }
    } else {
      candidates.push({ row: from.row, col: from.col + Math.sign(colDelta) })
      if (rowDelta !== 0) {
        candidates.push({ row: from.row + Math.sign(rowDelta), col: from.col })
      }
    }

    for (const candidate of candidates) {
      const tile = this.world?.getTile(candidate.row, candidate.col)
      if (tile?.passable) {
        return candidate
      }
    }

    return null
  }

  private applyDamage(target: IEntity, amount: number): void {
    const currentHealth = target.health ?? target.maxHealth ?? 0
    target.health = Math.max(0, currentHealth - amount)
  }

  private removeEntity(entity: IEntity): void {
    const index = this.entities.indexOf(entity)
    if (index >= 0) {
      this.entities.splice(index, 1)
      entity.destroy()
    }
  }

  private ensureEntityHealth(entity: IEntity): void {
    const defaultMaxHealth = entity.type === 'player' ? DEFAULT_PLAYER_HEALTH : DEFAULT_ENEMY_HEALTH
    let maxHealth = entity.maxHealth ?? defaultMaxHealth

    if (entity.health !== undefined && entity.health > maxHealth) {
      maxHealth = entity.health
    }

    entity.maxHealth = maxHealth
    entity.health = entity.health ?? maxHealth
  }
}

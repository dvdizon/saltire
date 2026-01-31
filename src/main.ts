import Phaser from 'phaser'

import type { IEntity } from './types'
import { Entity, InputRouter, IsoRenderer, World } from './engine'
import { ENTITY_SPAWNS, GameScene, MAP_DATA } from './game'

class IsoScene extends Phaser.Scene {
  private world!: World
  private entities: IEntity[] = []
  private inputRouter!: InputRouter
  private gameScene!: GameScene
  private isoRenderer!: IsoRenderer
  private endText?: Phaser.GameObjects.Text
  private restartText?: Phaser.GameObjects.Text

  create(): void {
    this.world = new World(10, 10)
    this.world.loadMap(MAP_DATA)

    this.entities = ENTITY_SPAWNS.map((spawn, index) =>
      new Entity(
        String(index + 1),
        spawn.type,
        { row: spawn.row, col: spawn.col },
        spawn.health,
        spawn.maxHealth
      )
    )

    this.inputRouter = new InputRouter(this, this.world, () => this.entities)

    this.gameScene = new GameScene()
    this.gameScene.initialize(this.world, this.inputRouter, this.entities)

    this.isoRenderer = new IsoRenderer(
      this.add.graphics(),
      this.world,
      () => this.entities,
      this.cameras.main.width,
      this.cameras.main.height
    )
  }

  update(_time: number, delta: number): void {
    this.gameScene.update(delta)
    this.isoRenderer.render()

    if (this.gameScene.isOver()) {
      this.showEndOverlay()
    }
  }

  private showEndOverlay(): void {
    if (this.endText) {
      return
    }

    const result = this.gameScene.getResult()
    const message = result === 'win' ? 'YOU WIN' : 'YOU LOSE'

    this.endText = this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY - 20, message, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
        color: '#ffffff'
      })
      .setOrigin(0.5)

    this.restartText = this.add
      .text(
        this.cameras.main.centerX,
        this.cameras.main.centerY + 24,
        'Refresh the page to restart',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#c7c7c7'
        }
      )
      .setOrigin(0.5)
  }
}

const config: Phaser.Types.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a2e',
  scene: [IsoScene]
}

new Phaser.Game(config)

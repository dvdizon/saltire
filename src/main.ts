import Phaser from 'phaser'

import type { IEntity } from './types'
import { Entity, InputRouter, IsoRenderer, World } from './engine'
import { GameScene, INITIAL_ENTITIES, MAP_TERRAIN } from './game'

class IsoScene extends Phaser.Scene {
  private world!: World
  private entities: IEntity[] = []
  private inputRouter!: InputRouter
  private gameScene!: GameScene
  private isoRenderer!: IsoRenderer
  private endOverlay?: Phaser.GameObjects.Container
  private endText?: Phaser.GameObjects.Text
  private restartText?: Phaser.GameObjects.Text

  create(): void {
    const mapRows = MAP_TERRAIN.length
    const mapCols = MAP_TERRAIN[0]?.length ?? mapRows
    this.world = new World(mapRows, mapCols)
    this.world.loadMap(MAP_TERRAIN)

    this.entities = INITIAL_ENTITIES.map((spawn, index) =>
      new Entity(
        String(index + 1),
        spawn.type,
        { row: spawn.position.row, col: spawn.position.col },
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

    this.scale.on('resize', this.handleResize, this)
    this.handleResize({ width: this.scale.width, height: this.scale.height })
  }

  update(_time: number, delta: number): void {
    this.gameScene.update(delta)
    this.isoRenderer.render()

    if (this.gameScene.isOver()) {
      this.showEndOverlay()
    }

    if (this.endOverlay) {
      this.updateEndOverlayPosition()
    }
  }

  private showEndOverlay(): void {
    if (this.endOverlay) {
      return
    }

    const result = this.gameScene.getResult()
    const message = result === 'win' ? 'YOU WIN' : 'YOU LOSE'

    const panelWidth = 360
    const panelHeight = 140
    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x0b1120, 0.9)
    panel.setStrokeStyle(2, 0xe2e8f0, 0.4)

    this.endText = this.add
      .text(0, -18, message, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
        color: '#f8fafc'
      })
      .setOrigin(0.5)

    this.restartText = this.add
      .text(0, 24, 'Refresh the page to restart', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#e2e8f0'
      })
      .setOrigin(0.5)

    this.endOverlay = this.add.container(0, 0, [panel, this.endText, this.restartText])
    this.endOverlay.setDepth(1000)
    this.updateEndOverlayPosition()
  }

  private handleResize = (gameSize: { width: number; height: number }): void => {
    const { width, height } = gameSize
    this.cameras.main.setViewport(0, 0, width, height)
    this.cameras.main.setSize(width, height)
    this.updateEndOverlayPosition()
  }

  private updateEndOverlayPosition(): void {
    if (!this.endOverlay) {
      return
    }

    const camera = this.cameras.main
    const centerX = camera.scrollX + camera.width / 2
    const centerY = camera.scrollY + camera.height / 2
    this.endOverlay.setPosition(centerX, centerY)
  }
}

const config: Phaser.Types.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight
  },
  backgroundColor: '#1a1a2e',
  scene: [IsoScene]
}

new Phaser.Game(config)


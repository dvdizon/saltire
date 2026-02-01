import Phaser from 'phaser'

import type { IEntity, EntitySnapshot } from './types'
import { Entity, InputRouter, IsoRenderer, World } from './engine'
import { GameScene, INITIAL_ENTITIES, MAP_TERRAIN } from './game'

class IsoScene extends Phaser.Scene {
  private world!: World
  private entities: IEntity[] = []
  private inputRouter!: InputRouter
  private gameScene!: GameScene
  private isoRenderer!: IsoRenderer
  private soundToggle?: Phaser.GameObjects.Container
  private soundIcon?: Phaser.GameObjects.Graphics
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
    this.gameScene.setEntityFactory((snap: EntitySnapshot) => new Entity(snap.id, snap.type, snap.position, snap.health, snap.maxHealth))

    this.isoRenderer = new IsoRenderer(
      this.add.graphics(),
      this.world,
      () => this.entities,
      this.cameras.main.width,
      this.cameras.main.height
    )

    this.createSoundToggle()
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

  private createSoundToggle(): void {
    if (this.soundToggle) {
      return
    }

    this.soundIcon = this.add.graphics()
    this.soundToggle = this.add.container(0, 0, [this.soundIcon])
    this.soundToggle.setDepth(1000)
    this.soundToggle.setScrollFactor(0)
    this.soundToggle.setScale(0.5)

    const hitArea = new Phaser.Geom.Circle(0, 0, 16)
    this.soundToggle.setInteractive(hitArea, Phaser.Geom.Circle.Contains)
    this.soundToggle.on('pointerover', () => {
      this.input.setDefaultCursor('pointer')
    })
    this.soundToggle.on('pointerout', () => {
      this.input.setDefaultCursor('default')
    })

    this.soundToggle.on('pointerdown', () => {
      if (this.sound.locked) {
        this.sound.unlock()
      }

      const soundManager = this.sound
      if ('context' in soundManager) {
        const context = soundManager.context
        if (context && context.state === 'suspended') {
          void context.resume()
        }
      }

      this.sound.mute = !this.sound.mute
      this.renderSoundIcon()
    })

    this.renderSoundIcon()
  }

  private renderSoundIcon(): void {
    if (!this.soundIcon) {
      return
    }

    const enabled = !this.sound.mute
    this.soundIcon.clear()
    this.soundIcon.lineStyle(2, 0xf8fafc, 0.95)

    this.soundIcon.strokeRect(-8, -6, 6, 12)
    this.soundIcon.beginPath()
    this.soundIcon.moveTo(-2, -6)
    this.soundIcon.lineTo(6, -12)
    this.soundIcon.lineTo(6, 12)
    this.soundIcon.lineTo(-2, 6)
    this.soundIcon.strokePath()

    if (enabled) {
      this.soundIcon.beginPath()
      this.soundIcon.arc(8, 0, 6, -0.6, 0.6)
      this.soundIcon.strokePath()

      this.soundIcon.beginPath()
      this.soundIcon.arc(10, 0, 10, -0.6, 0.6)
      this.soundIcon.strokePath()

      this.soundIcon.beginPath()
      this.soundIcon.arc(12, 0, 14, -0.6, 0.6)
      this.soundIcon.strokePath()
      return
    }

    this.soundIcon.lineStyle(2, 0xf8fafc, 0.95)
    this.soundIcon.beginPath()
    this.soundIcon.moveTo(10, -10)
    this.soundIcon.lineTo(20, 10)
    this.soundIcon.moveTo(10, 10)
    this.soundIcon.lineTo(20, -10)
    this.soundIcon.strokePath()
  }

  private handleResize = (gameSize: { width: number; height: number }): void => {
    const { width, height } = gameSize
    this.cameras.main.setViewport(0, 0, width, height)
    this.cameras.main.setSize(width, height)
    this.updateEndOverlayPosition()

    if (this.soundToggle) {
      this.soundToggle.setPosition(width - 32, height - 32)
    }
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

const config: Phaser.Types.Core.GameConfig = {
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


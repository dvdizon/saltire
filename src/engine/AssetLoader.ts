import Phaser from 'phaser'
import { AssetManifest, AssetType, IAssetLoader } from '../types'

const loadHandlers: Record<AssetType, (scene: Phaser.Scene, entry: any) => void> = {
  image: (scene, entry) => {
    scene.load.image(entry.key, entry.path)
  },
  spritesheet: (scene, entry) => {
    scene.load.spritesheet(entry.key, entry.path, {
      frameWidth: entry.frameWidth,
      frameHeight: entry.frameHeight,
    })
  },
  audio: (scene, entry) => {
    scene.load.audio(entry.key, entry.path)
  },
}

export class AssetLoader implements IAssetLoader {
  private cache = new Map<string, unknown>()

  constructor(private scene: Phaser.Scene) {}

  load(manifest: AssetManifest): Promise<void> {
    if (manifest.length === 0) {
      return Promise.resolve()
    }

    manifest.forEach((entry) => {
      loadHandlers[entry.type](this.scene, entry)
    })

    return new Promise((resolve) => {
      this.scene.load.once('complete', () => {
        manifest.forEach((entry) => {
          this.cache.set(entry.key, this.lookupAsset(entry.key, entry.type))
        })
        resolve()
      })
      this.scene.load.start()
    })
  }

  get(key: string): unknown {
    return this.cache.get(key)
  }

  private lookupAsset(key: string, type: AssetType): unknown {
    switch (type) {
      case 'audio':
        return this.scene.cache.audio.get(key)
      case 'image':
      case 'spritesheet':
        return this.scene.textures.get(key)
      default:
        return undefined
    }
  }
}

import { IGameLoop, TickCallback } from '../types'

export class GameLoop implements IGameLoop {
  private callbacks: TickCallback[] = []
  private running = false
  private lastTime = 0

  start(): void {
    if (this.running) {
      return
    }

    this.running = true
    this.lastTime = performance.now()
    requestAnimationFrame(this.tick)
  }

  onTick(callback: TickCallback): void {
    this.callbacks.push(callback)
  }

  private tick = (time: number): void => {
    if (!this.running) {
      return
    }

    const delta = time - this.lastTime
    this.lastTime = time

    this.callbacks.forEach((callback) => callback(delta))

    requestAnimationFrame(this.tick)
  }
}

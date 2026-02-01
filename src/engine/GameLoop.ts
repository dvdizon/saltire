import { IGameLoop, TickCallback } from '../types'

// Simple RAF-based loop that fans out delta time to subscribers.
export class GameLoop implements IGameLoop {
  private callbacks: TickCallback[] = []
  private running = false
  private lastTime = 0

  // Start ticking once; subsequent calls are ignored.
  start(): void {
    if (this.running) {
      return
    }

    this.running = true
    this.lastTime = performance.now()
    requestAnimationFrame(this.tick)
  }

  // Register tick listeners (world update, renderer, etc.).
  onTick(callback: TickCallback): void {
    this.callbacks.push(callback)
  }

  // Internal RAF handler that computes delta and invokes callbacks.
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

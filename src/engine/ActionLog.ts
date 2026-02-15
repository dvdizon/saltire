export type ActionLogEntry<A = unknown> = { tick: number; action: A }
export type ActionLogData<A = unknown> = {
  version: string
  startingSeed?: number
  tickDeltas: number[]
  actions: ActionLogEntry<A>[]
}

export class ActionLog<A = unknown> {
  private actions: ActionLogEntry<A>[] = []
  private tickDeltas: number[] = []
  private currentTick = 0
  private startingSeed?: number
  private index: Map<number, ActionLogEntry<A>[]> | null = null

  constructor(startingSeed?: number) {
    this.startingSeed = startingSeed
  }

  recordAction(action: A): void {
    const entry = { tick: this.currentTick, action }
    this.actions.push(entry)
    if (this.index) {
      const bucket = this.index.get(entry.tick)
      if (bucket) {
        bucket.push(entry)
      } else {
        this.index.set(entry.tick, [entry])
      }
    }
  }

  tick(deltaMs?: number): void {
    if (Number.isFinite(deltaMs) && deltaMs !== undefined && deltaMs >= 0) {
      this.tickDeltas[this.currentTick] = deltaMs
    }
    this.currentTick += 1
  }

  getCurrentTick(): number {
    return this.currentTick
  }

  getActionCount(): number {
    return this.actions.length
  }

  getMaxTick(): number {
    const lastActionTick = this.actions.length > 0 ? this.actions[this.actions.length - 1].tick : -1
    const lastDeltaTick = this.tickDeltas.length > 0 ? this.tickDeltas.length - 1 : -1
    const currentTick = this.currentTick - 1
    return Math.max(lastActionTick, lastDeltaTick, currentTick, 0)
  }

  getTickDelta(tick: number): number | null {
    const value = this.tickDeltas[tick]
    return Number.isFinite(value) ? value : null
  }

  getEntriesForTick(tick: number): ActionLogEntry<A>[] {
    this.ensureIndex()
    const entries = this.index?.get(tick)
    return entries ? [...entries] : []
  }

  getActionsForTick(tick: number): A[] {
    return this.getEntriesForTick(tick).map((entry) => entry.action)
  }

  getData(): ActionLogData<A> {
    return {
      version: '1.0',
      startingSeed: this.startingSeed,
      tickDeltas: [...this.tickDeltas],
      actions: this.actions.map((entry) => ({ tick: entry.tick, action: entry.action })),
    }
  }

  export(): string {
    return JSON.stringify(this.getData())
  }

  static import<A = unknown>(json: string): ActionLog<A> {
    const data = JSON.parse(json) as ActionLogData<A>
    return ActionLog.fromData<A>(data)
  }

  static fromData<A = unknown>(data: ActionLogData<A>): ActionLog<A> {
    const log = new ActionLog<A>(data.startingSeed)
    log.actions = Array.isArray(data.actions) ? data.actions.map((entry) => ({ ...entry })) : []
    log.tickDeltas = Array.isArray(data.tickDeltas) ? [...data.tickDeltas] : []
    const lastActionTick = log.actions.length > 0 ? log.actions[log.actions.length - 1].tick : -1
    log.currentTick = Math.max(lastActionTick + 1, log.tickDeltas.length)
    log.index = null
    return log
  }

  /** @internal Lazily builds a tick-indexed map for fast lookups. */
  private ensureIndex(): void {
    if (this.index) {
      return
    }
    this.index = new Map<number, ActionLogEntry<A>[]>()
    for (const entry of this.actions) {
      const bucket = this.index.get(entry.tick)
      if (bucket) {
        bucket.push(entry)
      } else {
        this.index.set(entry.tick, [entry])
      }
    }
  }
}

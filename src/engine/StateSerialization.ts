export function serializeGameState<T>(state: T): string {
  return JSON.stringify(state)
}

export function deserializeGameState<T>(json: string): T {
  return JSON.parse(json) as T
}

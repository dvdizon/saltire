import type { EntityPosition, IWorld, TerrainType } from '../types'

// Default square visibility size centered on the player.
export const DEFAULT_VISIBILITY_SIZE = 10

const BLOCKING_TERRAIN: TerrainType = 'wall'

// Stable string key for storing visibility/exploration in sets.
export function tileKey(row: number, col: number): string {
  return `${row},${col}`
}

// Simple line-of-sight check using incremental steps.
function hasLineOfSight(world: IWorld, start: EntityPosition, end: EntityPosition): boolean {
  const rowDelta = end.row - start.row
  const colDelta = end.col - start.col
  const steps = Math.max(Math.abs(rowDelta), Math.abs(colDelta))

  if (steps === 0) {
    return true
  }

  for (let step = 1; step <= steps; step += 1) {
    const row = Math.round(start.row + (rowDelta * step) / steps)
    const col = Math.round(start.col + (colDelta * step) / steps)

    if (row === end.row && col === end.col) {
      return true
    }

    const tile = world.getTile(row, col)
    if (!tile || tile.terrain === BLOCKING_TERRAIN) {
      return false
    }
  }

  return true
}

// Compute visible tiles in a square radius, filtering by line of sight.
export function computeVisibleTiles(
  world: IWorld,
  origin: EntityPosition,
  size: number = DEFAULT_VISIBILITY_SIZE,
): Set<string> {
  const visible = new Set<string>()
  const halfSize = Math.floor(size / 2)
  const minRow = origin.row - halfSize
  const minCol = origin.col - halfSize
  const maxRow = minRow + size - 1
  const maxCol = minCol + size - 1

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const tile = world.getTile(row, col)
      if (!tile) {
        continue
      }

      if (hasLineOfSight(world, origin, { row, col })) {
        visible.add(tileKey(row, col))
      }
    }
  }

  visible.add(tileKey(origin.row, origin.col))
  return visible
}

// Fast membership check for visibility state.
export function isTileVisible(visibleTiles: Set<string>, row: number, col: number): boolean {
  return visibleTiles.has(tileKey(row, col))
}

import type { TerrainType, EntityPosition } from '../types'

export const MAP_TERRAIN: TerrainType[][] = [
  ['grass', 'grass', 'grass', 'grass', 'grass', 'grass', 'dirt', 'dirt', 'sand', 'sand'],
  ['grass', 'grass', 'grass', 'grass', 'grass', 'dirt', 'dirt', 'sand', 'sand', 'sand'],
  ['grass', 'grass', 'grass', 'grass', 'dirt', 'dirt', 'sand', 'sand', 'water', 'water'],
  ['grass', 'grass', 'grass', 'dirt', 'dirt', 'sand', 'sand', 'water', 'water', 'water'],
  ['grass', 'grass', 'dirt', 'dirt', 'sand', 'sand', 'sand', 'water', 'wall', 'wall'],
  ['grass', 'dirt', 'dirt', 'sand', 'sand', 'sand', 'water', 'water', 'wall', 'wall'],
  ['dirt', 'dirt', 'sand', 'sand', 'sand', 'water', 'water', 'wall', 'wall', 'wall'],
  ['dirt', 'sand', 'sand', 'sand', 'water', 'water', 'wall', 'wall', 'wall', 'wall'],
  ['sand', 'sand', 'sand', 'water', 'water', 'wall', 'wall', 'wall', 'wall', 'wall'],
  ['sand', 'sand', 'water', 'water', 'wall', 'wall', 'wall', 'wall', 'wall', 'wall'],
]

export interface InitialEntityData {
  id: string
  type: string
  position: EntityPosition
  health?: number
  maxHealth?: number
}

export const INITIAL_ENTITIES: InitialEntityData[] = [
  {
    id: 'player-1',
    type: 'player',
    position: { row: 1, col: 1 },
    health: 5,
    maxHealth: 5,
  },
  {
    id: 'enemy-1',
    type: 'enemy',
    position: { row: 3, col: 4 },
    health: 2,
    maxHealth: 2,
  },
  {
    id: 'enemy-2',
    type: 'enemy',
    position: { row: 5, col: 2 },
    health: 2,
    maxHealth: 2,
  },
  {
    id: 'enemy-3',
    type: 'enemy',
    position: { row: 2, col: 7 },
    health: 2,
    maxHealth: 2,
  },
]

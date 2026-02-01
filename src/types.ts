// ─── Terrain ────────────────────────────────────────────────────────────────

export type TerrainType = 'grass' | 'dirt' | 'water' | 'wall' | 'sand'

export interface Tile {
  row: number
  col: number
  terrain: TerrainType
  passable: boolean
}

// ─── World interface ────────────────────────────────────────────────────────

export interface IWorld {
  readonly rows: number
  readonly cols: number
  getTile(row: number, col: number): Tile | null
  getAdjacentTiles(row: number, col: number): Tile[]
  getTilesInRange(row: number, col: number, range: number): Tile[]
  setTerrain(row: number, col: number, terrain: TerrainType): void
  loadMap(map: TerrainType[][]): void
}

// ─── Entity ─────────────────────────────────────────────────────────────────

export interface EntityPosition {
  row: number
  col: number
}

export interface IEntity {
  readonly id: string
  type: string
  position: EntityPosition
  health?: number
  maxHealth?: number
  update(delta: number): void
  destroy(): void
}

// ─── GameLoop ───────────────────────────────────────────────────────────────

export type TickCallback = (delta: number) => void

export interface IGameLoop {
  start(): void
  onTick(callback: TickCallback): void
}

// ─── InputRouter ────────────────────────────────────────────────────────────

export type TileSelectedCallback = (row: number, col: number) => void
export type EntityTappedCallback = (entity: IEntity) => void

export interface IInputRouter {
  onTileSelected(callback: TileSelectedCallback): void
  onEntityTapped(callback: EntityTappedCallback): void
}

// ─── AssetLoader ────────────────────────────────────────────────────────────

export type AssetType = 'image' | 'spritesheet' | 'audio'

export interface AssetEntry {
  key: string
  type: AssetType
  path: string
  frameWidth?: number
  frameHeight?: number
}

export type AssetManifest = AssetEntry[]

export interface IAssetLoader {
  load(manifest: AssetManifest): Promise<void>
  get(key: string): unknown
}

// ─── Isometric projection math (used by IsoRenderer and InputRouter) ───────
// Grid → Screen:  screenX = (col - row) * (tileWidth / 2)
//                 screenY = (col + row) * (tileHeight / 2)
// Screen → Grid:  row = (screenY / tileHeight) - (screenX / tileWidth)  [floored]
//                 col = (screenY / tileHeight) + (screenX / tileWidth)  [floored]
// Default tile dimensions: tileWidth = 64, tileHeight = 32

// ─── Game layer interfaces (used by Game Layer Agent, consumed by Integration Agent) ───────────

export interface IGameScene {
  initialize(world: IWorld, inputRouter: IInputRouter, entities: IEntity[]): void
  update(delta: number): void
  isOver(): boolean
  getResult(): 'win' | 'lose' | 'playing'
}

// ─── Game Actions (intent/action boundary for future multiplayer) ───────────

export type GameAction =
  | { kind: 'move';   entityId: string; to: EntityPosition }
  | { kind: 'attack'; attackerId: string; targetId: string }
  | { kind: 'remove'; entityId: string }

// ─── Serialization ──────────────────────────────────────────────────────────

export interface EntitySnapshot {
  id: string
  type: string
  position: EntityPosition
  health?: number
  maxHealth?: number
}

export interface GameSnapshot {
  entities: EntitySnapshot[]
  turn: 'player' | 'enemy'
  result: 'win' | 'lose' | 'playing'
  actionLog: GameAction[]
}

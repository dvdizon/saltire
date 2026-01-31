# Agent B — Engine Core

## Your Job: Engine Core

You are building the engine. Five components plus one renderer utility. These are the files that turn Phaser 3 into an isometric strategy game platform.

You own everything inside `src/engine/`. You do not touch anything outside that directory. You do not write `main.ts`. You do not import from `src/game/`.

---

## Context You Need

The engine sits on top of Phaser 3 and provides structure for isometric, tile-based, turn-oriented strategy games. The mental model is simple: a **World** (the grid), **Entities** (things in the grid), and a **GameLoop** (the heartbeat that keeps everything moving). An **InputRouter** translates touch/mouse into grid events. An **AssetLoader** wraps Phaser's loader. An **IsoRenderer** draws everything using Phaser's Graphics object — no external sprites, no sprite sheets. Colored shapes on an isometric grid.

There is no `phaser3-plugin-isometric`. Isometric projection is done manually. The math is simple and is documented in the shared types. You implement it directly in `IsoRenderer.ts` and reuse it in `InputRouter.ts` for hit detection.

All interfaces you implement are defined in `src/types.ts`. You import from there. You implement those interfaces. You do not invent new public interfaces.

---

## Shared Contract (for reference — the source of truth lives in src/types.ts)

```typescript
export type TerrainType = 'grass' | 'dirt' | 'water' | 'wall' | 'sand'

export interface Tile {
  row: number
  col: number
  terrain: TerrainType
  passable: boolean
}

export interface IWorld {
  readonly rows: number
  readonly cols: number
  getTile(row: number, col: number): Tile | null
  getAdjacentTiles(row: number, col: number): Tile[]
  getTilesInRange(row: number, col: number, range: number): Tile[]
  setTerrain(row: number, col: number, terrain: TerrainType): void
  loadMap(map: TerrainType[][]): void
}

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

export type TickCallback = (delta: number) => void

export interface IGameLoop {
  start(): void
  onTick(callback: TickCallback): void
}

export type TileSelectedCallback = (row: number, col: number) => void
export type EntityTappedCallback  = (entity: IEntity) => void

export interface IInputRouter {
  onTileSelected(callback: TileSelectedCallback): void
  onEntityTapped(callback: EntityTappedCallback): void
}

export type AssetManifest = AssetEntry[]
export interface AssetEntry {
  key: string
  type: 'image' | 'spritesheet' | 'audio'
  path: string
  frameWidth?: number
  frameHeight?: number
}

export interface IAssetLoader {
  load(manifest: AssetManifest): Promise<void>
  get(key: string): unknown
}
```

---

## Constructor Signatures (must match exactly)

These are the concrete shapes that Agent D will call. Build to these signatures exactly. No reordering, no options objects, no defaults that change the arity.

```typescript
new World(rows: number, cols: number)
new Entity(id: string, type: string, position: EntityPosition, health?: number, maxHealth?: number)
new InputRouter(scene: Phaser.Scene, world: IWorld, getEntities: () => IEntity[])
new IsoRenderer(graphics: Phaser.GameObjects.Graphics, world: IWorld, getEntities: () => IEntity[], screenWidth: number, screenHeight: number)
new AssetLoader(scene: Phaser.Scene)

// IsoRenderer.render() takes no arguments. It reads world and entities from stored references each frame.
```

---

## Files You Produce

```
src/engine/
├── World.ts
├── Entity.ts
├── GameLoop.ts
├── InputRouter.ts
├── AssetLoader.ts
├── IsoRenderer.ts
└── index.ts
```

---

## Isometric Projection Math

This is used in two places: `IsoRenderer.ts` (drawing) and `InputRouter.ts` (hit detection). Define it once as a shared utility inside `IsoRenderer.ts` and export it. `InputRouter.ts` imports it from there.

Default tile dimensions: `TILE_W = 64`, `TILE_H = 32`.

**Grid to Screen:**
```
screenX = (col - row) * (TILE_W / 2)
screenY = (col + row) * (TILE_H / 2)
```

**Screen to Grid** (for hit detection — returns the nearest grid cell):
```
row = Math.floor((screenY / TILE_H) - (screenX / TILE_W))
col = Math.floor((screenY / TILE_H) + (screenX / TILE_W))
```

The camera offset must be added/subtracted when converting between screen and world coordinates. The renderer centers the grid on screen by calculating an origin offset based on map dimensions.

---

## Component 1: World.ts

The World is the isometric grid. It stores tile data. It answers spatial queries. It knows nothing about rendering.

**Implementation notes:**

**Constructor:** `new World(rows: number, cols: number)`

The grid is a 2D array: `grid[row][col]`. The constructor allocates the grid at the given dimensions and fills every tile with a default terrain type (`grass`). Every tile gets its `passable` flag set from a terrain config table you define at module scope:

```
grass → passable: true
dirt  → passable: true
sand  → passable: true
water → passable: false
wall  → passable: false
```

`getTile` returns `null` for out-of-bounds coordinates. Never throw on bad input — return null and let the caller decide.

`getAdjacentTiles` returns up to 8 neighbors (cardinal + diagonal). Filter out nulls.

`getTilesInRange` returns all tiles within a square of the given range, excluding the center tile. This is a simple nested loop over `[row-range, row+range]` × `[col-range, col+range]`.

`loadMap` accepts a 2D array of `TerrainType` strings and overwrites the grid. It's the primary way a game defines its map layout. Clamp to grid bounds — don't crash if the input array is a different size than the grid.

Export the `World` class and also export the terrain config table (other modules need it for rendering colors).

---

## Component 2: Entity.ts

An Entity is anything that exists in the World. The engine doesn't care what it is — that's the game layer's job. The engine just manages the lifecycle.

**Implementation notes:**

**Constructor:** `new Entity(id: string, type: string, position: EntityPosition, health?: number, maxHealth?: number)`

The `Entity` class implements `IEntity`. The caller (Agent D, in `main.ts`) is responsible for generating unique `id` values — use a simple incrementing counter there. Health fields are optional — set them only if the constructor receives them.

The `update` method is a no-op by default. The game layer will call it every tick. Static entities (buildings, items) don't override it. Moving entities will have their position updated externally by the game layer — the Entity class itself does not move.

The `destroy` method is a no-op for now. It exists as a hook. When we add sprite cleanup later, this is where it happens.

Export the `Entity` class.

---

## Component 3: GameLoop.ts

The GameLoop is the heartbeat. It owns the Phaser Scene and runs the update/render cycle.

**Implementation notes:**

The `GameLoop` class wraps a Phaser Scene. It extends `Phaser.Scene` (or composes one — your choice, but composition is cleaner). The Scene's `update` method is where the loop ticks.

It maintains a list of tick callbacks registered via `onTick`. On each Phaser update cycle, it calls every registered callback with the delta time in milliseconds.

The `start` method is called once, after Phaser is initialized. For this prototype, it's mostly a signal that the loop is live.

Keep it dumb. It does not know about turns, combat, or game state. It just ticks.

Export the `GameLoop` class.

---

## Component 4: InputRouter.ts

The InputRouter translates raw Phaser input events into grid-level game events.

**Implementation notes:**

**Constructor:** `new InputRouter(scene: Phaser.Scene, world: IWorld, getEntities: () => IEntity[])`

The `InputRouter` class implements `IInputRouter`. `scene` gives access to the input manager and camera. `world` is used for bounds checking after coordinate conversion. `getEntities` is a getter function, not a snapshot — it returns the live entity array so that entity lookups stay current as entities are added and removed during play.

It maintains callback arrays for `tileSelected` and `entityTapped`. The `onTileSelected` and `onEntityTapped` methods push callbacks onto these arrays.

To detect taps/clicks, listen to the Phaser Scene's pointer input. On pointer down (or up — pick one, be consistent), convert the pointer's screen position to grid coordinates using the isometric math from `IsoRenderer.ts`. Account for camera scroll offset.

After converting to grid coordinates, bounds-check against the World. If the coordinates are valid, fire `tileSelected` callbacks. Then check if any entity occupies that tile — if so, also fire `entityTapped` callbacks.

On mobile, the math is the same. The pointer events work identically for touch and mouse in Phaser. No special-casing needed at this stage.

Import the grid-to-screen and screen-to-grid math from `IsoRenderer.ts`.

Export the `InputRouter` class.

---

## Component 5: AssetLoader.ts

A thin wrapper around Phaser's built-in loader. Adds one thing: a manifest-based convention.

**Implementation notes:**

The `AssetLoader` class implements `IAssetLoader`. It is constructed with a reference to the Phaser Scene (for accessing `this.scene.load`).

The `load` method iterates the manifest array and calls the appropriate Phaser loader method for each entry type (`load.image`, `load.spritesheet`, `load.audio`). It then returns a Promise that resolves when Phaser's loader finishes. Phaser's loader has a built-in event for this — listen for the `complete` event on the loader.

The `get` method wraps `this.scene.textures.get(key)` for images/spritesheets and `this.scene.sound.get(key)` for audio. For this prototype, it will rarely be called — we're drawing procedurally. But the interface needs to exist.

**Important:** For this prototype, the asset manifest will be empty. No external assets are loaded. The `load` method should handle an empty manifest gracefully — just resolve immediately.

Export the `AssetLoader` class.

---

## Component 6: IsoRenderer.ts

This is not one of the five architecture components — it's an implementation detail of the engine layer. It's responsible for drawing the World and all Entities to screen using Phaser's Graphics object.

**Implementation notes:**

**Constructor:** `new IsoRenderer(graphics: Phaser.GameObjects.Graphics, world: IWorld, getEntities: () => IEntity[], screenWidth: number, screenHeight: number)`

**render():** `isoRenderer.render(): void` — no arguments. Reads world and entities from stored references each frame.

This module does two things: exports the isometric projection math functions, and provides the `IsoRenderer` class that draws the current game state each frame. `getEntities` is a getter function, not a snapshot — the renderer calls it each frame to get the live entity list, because entities are added and removed during play.

**Projection functions (export these):**

```typescript
export const TILE_W = 64
export const TILE_H = 32

export function gridToScreen(row: number, col: number, originX: number, originY: number): { x: number, y: number } {
  return {
    x: originX + (col - row) * (TILE_W / 2),
    y: originY + (col + row) * (TILE_H / 2)
  }
}

export function screenToGrid(screenX: number, screenY: number, originX: number, originY: number): { row: number, col: number } {
  const relX = screenX - originX
  const relY = screenY - originY
  return {
    row: Math.floor((relY / TILE_H) - (relX / TILE_W)),
    col: Math.floor((relY / TILE_H) + (relX / TILE_W))
  }
}
```

The origin is the screen position of tile (0,0). Calculate it once based on the map dimensions so the grid is centered on screen.

**Origin calculation:**

For a grid of `rows × cols`, the origin that centers it is:
```
originX = screenWidth / 2
originY = screenHeight / 2 - ((rows + cols) * TILE_H / 2) / 2
```

This is approximate. Tweak if the grid looks off-center.

**Terrain colors** (used for drawing tiles):

```
grass → #4a7c3f
dirt  → #8b6914
sand  → #c2b280
water → #2e6b8a
wall  → #5c5c6e
```

**Drawing tiles:**

Each tile is a diamond (rhombus). Draw it as a filled polygon with 4 points:
- Top:    (x, y - TILE_H/2)
- Right:  (x + TILE_W/2, y)
- Bottom: (x, y + TILE_H/2)
- Left:   (x - TILE_W/2, y)

Where (x, y) is the result of `gridToScreen` for that tile. Draw with the terrain color as fill. Add a thin dark outline (stroke) so tiles are visually distinct.

**Drawing order:** Draw tiles in row-major order (row 0 col 0, row 0 col 1, ..., row 1 col 0, ...). In isometric projection, this back-to-front order ensures correct depth.

**Drawing entities:**

After all tiles are drawn, draw entities. Sort them by `(position.row + position.col)` ascending — this is the isometric depth sort. Entities further from the camera (lower row+col sum) are drawn first.

Each entity is drawn as a colored circle on top of its tile. The center of the circle is at the tile's screen position, offset slightly upward (subtract `TILE_H * 0.3` from y) so it sits on the tile surface rather than at its center.

Entity colors by type:
```
player  → #e74c3c  (red)
enemy   → #9b59b6  (purple)
goal    → #f1c40f  (gold)
```

Circle radius: 10px. Add a white stroke (2px) as an outline.

If the entity has health defined, draw a small health bar above the circle. The bar is 20px wide, 4px tall, centered above the entity. Green for remaining health, dark gray for lost health.

**The render function:**

The `IsoRenderer` class stores all constructor arguments as instance properties. Each call to `render()` clears the graphics object, then draws all tiles, then draws all entities (fetched fresh via the `getEntities` getter). The game loop in `main.ts` calls `render()` every frame.

Export the `IsoRenderer` class.

---

## index.ts (barrel export)

Re-export everything the outside world needs:

```typescript
export { World } from './World'
export { Entity } from './Entity'
export { GameLoop } from './GameLoop'
export { InputRouter } from './InputRouter'
export { AssetLoader } from './AssetLoader'
export { IsoRenderer, gridToScreen, screenToGrid, TILE_W, TILE_H } from './IsoRenderer'
```

---

## What You Must Not Do

Do not import from `src/game/`. Do not write `src/main.ts`. Do not add npm dependencies. Do not invent public interfaces not in the shared contract. If something feels missing from the contract, leave a `// TODO:` comment — do not improvise a solution.

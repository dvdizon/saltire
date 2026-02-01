# BUILD_PLAN.md
## Iso Engine — Prototype Build Plan
**Date:** January 2026
**Author:** David Dizon

---

## What This Document Is

This is the execution plan for the prototype. It answers three questions: what are we building, how is the work split, and in what order does it run.

Everything downstream — the agent specs — is derived from this. If something in an agent spec conflicts with this document, this document wins.

---

## The One Thing the Prototype Has to Prove

The PRD's north star is outcome 4.1: *a developer can build a playable prototype in under a week.* The prototype doesn't prove the engine is polished. It proves the engine works — that the scaffolding is real and the path from idea to playable is short.

That means we need two things, and both matter equally:

The engine itself has to function. All five components from the Architecture doc — World, Entity, GameLoop, InputRouter, AssetLoader — have to be operational and wired together.

A game has to run on top of it. Not a tech demo. An actual playable scenario with a grid, units, turns, and a win condition. This is the proof of concept. Without it, the engine is just scaffolding nobody has used.

---

## One Strategic Decision: Drop the Isometric Plugin

The Architecture doc specifies `phaser3-plugin-isometric`. In practice, this plugin is poorly maintained, has known compatibility issues with recent Phaser 3 versions, and introduces a fragile external dependency at the exact moment we need things to just work.

The isometric projection math is trivial — it's a coordinate transform, not a rendering system. We implement it directly in the engine's IsoRenderer utility. This is actually more aligned with the Architecture doc's own principle: *"The World stores a standard 2D array. The isometric projection is handled at draw time."* The plugin was always just doing that math for us. We do it ourselves.

The door stays open. If a future phase needs the plugin's more advanced features (3D stacking, dynamic depth sorting for large scenes), we swap it in then. For the prototype, it's one less thing to break.

---

## How the Work Is Split

The constraint is the tooling. Claude Code and Codex are agentic coders — they can build an entire module from a spec. But they don't share a live workspace. Each agent gets a self-contained spec and ships a self-contained set of files.

This means shared interfaces can't be discovered at runtime between agents. They have to be defined here, in the plan, and included verbatim in every spec that needs them. That's what the Shared Contract section below does.

The work breaks into four units:

**Scaffolder + Shared Types Agent:** Project config and shared types. The bones everything else attaches to. `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, and the shared `types.ts` file that defines every interface used across the engine.

**Engine Core Agent:** The five components from the Architecture doc, implemented as a single cohesive module. These components are tightly coupled — World talks to Entity, InputRouter needs to know about Entity positions, GameLoop orchestrates all of them. They belong together, owned by one agent.

**Game Layer Agent:** The demo game that runs on top of the engine. A small tactical scenario: isometric grid map, a player unit, enemy units, turn-based movement, simple combat, a win/lose condition. This agent writes against the engine's published interfaces — it does not need to see the Engine Core Agent's implementation. It just needs the contracts.

**Integration Agent:** The `main.ts` entry point that wires scaffolder, engine, and game layers together into a running application. Plus the `README.md`. This runs last, after the other three have shipped.

---

## Execution Order

```
Phase 1 — Parallel
  ├── Scaffolder + Shared Types Agent
  ├── Engine Core Agent
  └── Game Layer Agent

Phase 2 — Serial (runs after Phase 1 is complete)
  └── Integration Agent
```

Phase 1 agents can run simultaneously because they each write to non-overlapping file paths and all build against the same shared contract defined below. Phase 2 runs after because it needs to import from all three.

---

## File Structure

Every agent knows exactly where its files go. No ambiguity.

```
saltire/
├── package.json                  ← Scaffolder + Shared Types Agent
├── tsconfig.json                 ← Scaffolder + Shared Types Agent
├── vite.config.ts                ← Scaffolder + Shared Types Agent
├── index.html                    ← Scaffolder + Shared Types Agent
├── src/
│   ├── types.ts                  ← Scaffolder + Shared Types Agent  (shared contract — source of truth)
│   ├── engine/
│   │   ├── World.ts              ← Engine Core Agent
│   │   ├── Entity.ts             ← Engine Core Agent
│   │   ├── GameLoop.ts           ← Engine Core Agent
│   │   ├── InputRouter.ts        ← Engine Core Agent
│   │   ├── AssetLoader.ts        ← Engine Core Agent
│   │   ├── IsoRenderer.ts        ← Engine Core Agent  (draws tiles + entities using Phaser Graphics)
│   │   └── index.ts              ← Engine Core Agent  (barrel export)
│   ├── game/
│   │   ├── MapData.ts            ← Game Layer Agent
│   │   ├── TurnManager.ts        ← Game Layer Agent
│   │   ├── GameScene.ts          ← Game Layer Agent
│   │   └── index.ts              ← Game Layer Agent  (barrel export)
│   └── main.ts                   ← Integration Agent
└── README.md                     ← Integration Agent
```

---

## Shared Contract

This is the single source of truth for every interface and type used across the engine and game layer. Every agent spec includes this verbatim. No agent invents types. No agent guesses at what another agent exported.

```typescript
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
export type EntityTappedCallback  = (entity: IEntity) => void

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
```

---

## Constructor Signatures

The shared contract defines interfaces. It does not define how to instantiate the classes that implement them. That gap lives here. Every constructor signature below is the exact shape the Integration Agent will call. The Engine Core Agent must match them. No guessing at either end.

```typescript
// World — the isometric grid
new World(rows: number, cols: number)

// Entity — anything that exists in the World
new Entity(id: string, type: string, position: EntityPosition, health?: number, maxHealth?: number)

// InputRouter — translates pointer events into grid events
// scene: the Phaser Scene that owns the input manager
// world: used for bounds checking after coordinate conversion
// getEntities: getter, not snapshot — returns the live array so entity lookups stay current
new InputRouter(scene: Phaser.Scene, world: IWorld, getEntities: () => IEntity[])

// IsoRenderer — draws the world and entities each frame
// graphics: a Phaser Graphics object, created in the Scene with this.add.graphics()
// world: the World instance, read each frame for current tile state
// getEntities: getter, not snapshot — same reason as InputRouter
// screenWidth / screenHeight: used to calculate the isometric origin (centers the grid)
new IsoRenderer(graphics: Phaser.GameObjects.Graphics, world: IWorld, getEntities: () => IEntity[], screenWidth: number, screenHeight: number)

// IsoRenderer.render() — no arguments. Reads world and entities from stored references.
isoRenderer.render(): void

// AssetLoader — thin wrapper around Phaser's loader
new AssetLoader(scene: Phaser.Scene)
```

---

## What Each Agent Must Not Do

These constraints keep agents isolated and the integration clean.

No agent imports from a sibling agent's directory. The Engine Core Agent does not import from `game/`. The Game Layer Agent does not import from `engine/`. They both import only from `../types.ts`.

No agent invents types not in the shared contract. If something is missing, it should have been caught here. Flag it rather than improvise.

No agent writes `main.ts`. That's the Integration Agent's job and the only place where `engine/` and `game/` are wired together.

No agent reaches for external npm packages beyond Phaser 3. Everything is rendered programmatically using Phaser's built-in Graphics object. There are no sprites, no sprite sheets, no external assets in this prototype. Colored shapes on an isometric grid is the visual target.

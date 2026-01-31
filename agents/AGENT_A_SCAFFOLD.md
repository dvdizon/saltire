# AGENT_A_SCAFFOLD.md

## Your Job: Project Scaffold + Shared Types

You are building the skeleton that the other modules attach to. Four config files, one HTML shell, and one TypeScript file that defines every shared interface in the project. Nothing else.

-----

## Context You Need

This is a 2D isometric strategy game engine built on Phaser 3. It targets mobile web first, desktop second. The build stack is Vite + TypeScript. The engine is MIT licensed and open-source from day one.

You do not need to understand how the engine works. You just need to produce the correct files in the correct locations. The interfaces in `types.ts` are the single source of truth for the entire project — other agents will import from this file and build against these contracts. Do not change them. Write them exactly as specified below.

-----

## Files You Produce

```
saltire/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    └── types.ts
```

-----

## package.json

```json
{
  "name": "saltire",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "phaser": "^3.70.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.1.0"
  }
}
```

No other dependencies. No eslint, no prettier, no testing framework. This is a prototype. Friction is the enemy.

-----

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`noEmit: true` because Vite handles the actual compilation. `tsc` is only used for type checking.

-----

## vite.config.ts

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

Minimal. No plugins. No special config. Vite's defaults handle everything we need.

-----

## index.html

The HTML shell. Mobile-first viewport. No scrolling, no tap highlight, full-bleed canvas. The game renders into `#game-container`. The entry point is `src/main.ts` — but you do not write that file. It will be provided by another agent later.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <title>Saltire — Prototype</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #1a1a2e;
      touch-action: none;
      -webkit-tap-highlight-color: transparent;
    }
    #game-container {
      width: 100%;
      height: 100%;
    }
    canvas {
      display: block;
    }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

-----

## src/types.ts

This is the most important file you produce. Every interface, every type, every contract used across the engine and the game layer is defined here. Other agents import from this file. You write it exactly as specified. No additions, no modifications.

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

// ─── Game layer interface ───────────────────────────────────────────────────

export interface IGameScene {
  initialize(world: IWorld, inputRouter: IInputRouter, entities: IEntity[]): void
  update(delta: number): void
  isOver(): boolean
  getResult(): 'win' | 'lose' | 'playing'
}
```

-----

## After You Finish

Run `npm install` from the project root to verify the dependency resolution works. That's the only validation step. The project will not compile yet — `src/main.ts` does not exist. That's expected. It's another agent's job.

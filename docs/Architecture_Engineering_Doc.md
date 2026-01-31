# Architecture & Engineering Requirements Document
## 2D Isometric Game Engine
**Status:** Ideation
**Date:** January 2026
**Authors:** David Dizon

---

## Part 1 — System Design

### The Mental Model

Before any code, here's the idea. Everything else in this document is just a more detailed version of this.

A game built on this engine is made of three things: a **World**, the **Entities** that live in it, and a **Loop** that keeps everything moving.

```
┌─────────────────────────────────────────────┐
│                   Game Loop                  │
│   (tick → input → update → render → repeat)  │
└───────────┬─────────────────┬───────────────┘
            │                 │
            ▼                 ▼
┌───────────────────┐  ┌─────────────────┐
│       World       │  │    Entities     │
│  (isometric grid, │  │ (units, items,  │
│   tiles, layers)  │  │  buildings...)  │
└───────────────────┘  └─────────────────┘
            │                 │
            └────────┬────────┘
                     ▼
          ┌─────────────────┐
          │   Phaser 3      │
          │ (rendering,     │
          │  input, audio,  │
          │  asset loading) │
          └─────────────────┘
```

That's the whole system. The Game Loop orchestrates. The World defines the space. Entities are the things that exist inside that space. Phaser handles everything below — the actual pixels, the sound, the browser glue.

If you can hold that picture in your head, you can navigate anything else in this doc.

---

### How the Layers Talk

**Game Loop → World and Entities:** The loop is the clock. Each tick, it tells the World to update its state, tells each Entity to update itself, then tells the renderer to draw the current frame. It doesn't care what's inside the World or what the Entities are doing — it just keeps the cadence.

**Entities → World:** Entities know where they are in the World. They can query it — "what tile am I on?", "what's adjacent to me?" — but they don't own the World or mutate it directly. If an Entity needs to change the World (moving to a new tile, modifying terrain), it does so through an explicit action that the Loop processes.

**Everything → Phaser:** Phaser is the engine underneath. It renders sprites, handles touch and mouse input, loads assets, plays audio. This engine never bypasses Phaser to do any of that. It only adds structure *on top* of what Phaser already does well.

---

### Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Rendering & Browser | Phaser 3 | MIT license, purpose-built for 2D web games, massive community |
| Isometric Projection | IsoRenderer (custom) | The projection math is a simple coordinate transform. Implemented directly in the engine rather than relying on an external plugin — fewer dependencies, no compatibility risk, and fully aligned with how the World already works (see below). |
| Language | TypeScript | Catches errors early, better tooling, easier to onboard new contributors |
| Build | Vite | Fast dev server, minimal config, works well with TypeScript and modern JS |
| License | MIT | Maximum freedom for contributors and downstream users |

---

### What Lives in the Engine vs. What Lives in the Game

This boundary is one of the most important decisions in the architecture. The engine should be opinionated enough to be fast, but not so opinionated that it gets in the way.

**Engine owns:**
- Isometric rendering and camera management
- The World/Grid abstraction (tiles, layers, coordinates)
- The Entity lifecycle (create, update, render, destroy)
- The Game Loop structure
- Input routing (translating touch/mouse into game-meaningful events)
- Asset loading conventions

**Game owns:**
- What the entities actually *are* (units, enemies, items)
- What the rules *are* (turn structure, win/lose conditions, combat)
- Map/level data and layout
- UI and menus
- All game-specific logic

---

## Part 2 — Component Specifications

### Component 1: World

The World is the isometric grid. It's the space where everything happens.

**Responsibilities:**
- Stores the tile grid and its properties (terrain type, passability, visual layer)
- Supports multiple layers (ground, objects, effects) so sprites can stack correctly in isometric depth order
- Provides coordinate conversion between grid space (row, col) and screen space (pixels)
- Answers spatial queries: what's at this tile, what's adjacent, what's in range

**Key Design Decisions:**
- The grid is rectangular in data, isometric in rendering. The World stores a standard 2D array. The isometric projection is handled at draw time by the engine's IsoRenderer — the World doesn't need to know about it.
- Layers are ordered. The rendering pass draws them back-to-front so that entities further "up" in the isometric view appear behind entities further "down." This is handled automatically based on grid position.

**Interface (simplified):**
```typescript
class World {
  getTile(row: number, col: number): Tile
  getAdjacentTiles(row: number, col: number): Tile[]
  getTilesInRange(row: number, col: number, range: number): Tile[]
  setTerrain(row: number, col: number, terrain: TerrainType): void
}
```

---

### Component 2: Entity

An Entity is anything that exists in the World — a unit, an enemy, an item, a building, an effect.

**Responsibilities:**
- Knows its position in the World (row, col)
- Has a sprite that renders at the correct isometric screen position
- Runs an update function each tick (can be a no-op for static entities)
- Can be created and destroyed cleanly without leaking state

**Key Design Decisions:**
- Entities are not subclasses of each other. A unit and a building are both Entities. What makes them *behave* differently is the logic the game layer attaches to them — not inheritance chains. This keeps the engine thin and the game layer flexible.
- Every Entity has a type tag. The game layer uses these tags to route logic. The engine doesn't care what the tags are.

**Interface (simplified):**
```typescript
class Entity {
  position: { row: number, col: number }
  sprite: Phaser.GameObjects.Sprite
  type: string
  update(delta: number): void
  destroy(): void
}
```

---

### Component 3: Game Loop

The Game Loop is the heartbeat. It coordinates the order of operations every frame.

**Responsibilities:**
- Runs the update/render cycle at a consistent frame rate
- Routes input events into the game's event system
- Manages the sequence: process input → update world state → update entities → render

**Key Design Decisions:**
- The loop is intentionally dumb. It doesn't know what a "turn" is, or what "combat" means. It just ticks. If the game is turn-based, the game layer implements turn logic *inside* the entity update functions. The loop doesn't change.
- This makes the same loop work for turn-based games, real-time games, or anything in between. The game decides the pacing. The loop just keeps time.

**Interface (simplified):**
```typescript
class GameLoop {
  start(): void
  onTick(callback: (delta: number) => void): void
  onInput(event: InputEvent): void
}
```

---

### Component 4: Input Router

Translates raw browser input (touch, mouse, keyboard) into events the game can act on.

**Responsibilities:**
- Listens to Phaser's input system
- Converts screen coordinates into grid coordinates (which tile was tapped/clicked)
- Emits clean, game-meaningful events: `tileSelected`, `entityTapped`, `scrollGesture`

**Key Design Decisions:**
- The Input Router is the only component that knows about the difference between mobile and desktop input. Everything above it just receives events. This makes it straightforward to add or adjust input behavior without touching game logic.
- On mobile, tap targets are sized generously. The router handles the mapping from finger position to intended tile, accounting for the isometric angle.

**Interface (simplified):**
```typescript
class InputRouter {
  onTileSelected(callback: (row: number, col: number) => void): void
  onEntityTapped(callback: (entity: Entity) => void): void
}
```

---

### Component 5: Asset Loader

Handles loading and organizing all game assets before play begins.

**Responsibilities:**
- Loads sprite sheets, tile sets, audio, and any other assets
- Makes them available to the rest of the engine by a simple key
- Runs before the game loop starts — nothing renders until assets are ready

**Key Design Decisions:**
- This is a thin wrapper around Phaser's built-in loader. It adds one thing: a convention. All assets are referenced by a string key, defined in a manifest file the game provides. This keeps asset references consistent and makes it easy to swap assets without changing code.

**Interface (simplified):**
```typescript
class AssetLoader {
  load(manifest: AssetManifest): Promise<void>
  get(key: string): Phaser.Textures.Texture | Phaser.Sound.Base
}
```

---

## Part 3 — Constraints and Open Questions

**Performance target:** 60fps on a mid-range mobile device in a mobile browser. Phaser 3 with WebGL rendering handles this well for the entity counts typical in strategy/roguelike games. We'll validate this with a benchmark once the World and Entity components are functional.

**Save/state management:** Not scoped for the first phase. The engine provides no opinions on this yet. It's a game-layer concern for now.

**Multiplayer:** Out of scope entirely for now. Nothing in the architecture blocks it later, but nothing is designed for it either.

**Open question — turn structure:** The Game Loop is intentionally agnostic about whether a game is turn-based or real-time. The first game we build on this will likely be turn-based. Once we have that working, we'll revisit whether any turn-related utilities belong in the engine or stay in the game layer.

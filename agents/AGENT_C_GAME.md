# Agent C — Game Layer

## Your Job: Build the Demo Game

You are responsible for the playable demo game that sits on top of the engine. This layer defines the map data, turn structure, and win/lose logic. It **must only use the shared interfaces in `src/types.ts`** and **must not import from `src/engine/`**.

-----

## Context You Need

The goal of this prototype is to prove a developer can build a playable isometric game quickly. The game layer should be small but complete: a grid map, a player unit, a few enemy units, turn-based movement, basic combat, and win/lose conditions.

The engine already handles rendering, input translation, and ticking. Your code should be pure game logic and data.

-----

## Files You Produce

```
src/game/
├── MapData.ts
├── TurnManager.ts
├── GameScene.ts
└── index.ts
```

-----

## Shared Contract (Imports)

All game files should import from `src/types.ts` only:

```typescript
import type { TerrainType, IWorld, IInputRouter, IEntity } from '../types'
```

Do not import from `src/engine/`.

-----

## Implementation Requirements

### 1) MapData.ts
- Export a `TerrainType[][]` map (suggested size: 10x10 or 12x12).
- Include a mix of `grass`, `dirt`, `sand`, `water`, and `wall`.
- Provide a small number of impassable tiles (`water`, `wall`) to make movement meaningful.
- Export initial entity placements (player + enemies) as plain objects with `id`, `type`, `position`, and optional `health`/`maxHealth`.

### 2) TurnManager.ts
- Owns turn state for a simple turn-based loop.
- Suggested turn states: `'player' | 'enemy'`.
- Provide methods such as `getCurrentTurn()`, `endPlayerTurn()`, and `startEnemyTurn()`.
- Keep the implementation minimal — no UI, no timers.

### 3) GameScene.ts
- Implements `IGameScene` from `src/types.ts`.
- Stores references to `world`, `inputRouter`, and `entities` passed via `initialize`.
- Identifies the player (`type === 'player'`) and enemies (`type === 'enemy'`).
- Hooks into `inputRouter`:
  - `onTileSelected`: if it is the player's turn and the tile is adjacent + passable, move the player.
  - `onEntityTapped`: if it is the player's turn and an enemy is adjacent, apply damage.
- After a valid player action, end the player turn and trigger a simple enemy phase.
- Enemy logic (simple AI): for each enemy, if adjacent to the player, deal damage; otherwise move one step toward the player (Manhattan). Ignore moves into impassable tiles or occupied tiles.
- Win condition: all enemies eliminated → `win`.
- Lose condition: player health <= 0 → `lose`.
- Otherwise return `playing`.

### 4) index.ts
- Barrel export the game-layer classes and data.

-----

## What You Must Not Do

- Do not import or reference Phaser directly.
- Do not import from `src/engine/`.
- Do not introduce new types not in the shared contract.
- Do not add UI or DOM elements. All visuals are handled by the engine.

-----

## When You Finish

No tests are required. The integration step will wire this into Phaser.

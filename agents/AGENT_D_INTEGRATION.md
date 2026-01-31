# Agent D — Integration

## Your Job: Wire It All Together

You are responsible for the `main.ts` entry point and the `README.md`. This is where the engine and game layers are instantiated and connected inside Phaser.

This agent runs last, after Agents A, B, and C have shipped.

-----

## Files You Produce

```
src/
└── main.ts

README.md
```

-----

## Context You Need

- The engine lives in `src/engine/` and exports `World`, `Entity`, `GameLoop`, `InputRouter`, `IsoRenderer`, and `AssetLoader`.
- The game layer lives in `src/game/` and exports `MapData`, `TurnManager`, and `GameScene` (plus any map/entity seed data).
- Shared interfaces live in `src/types.ts`.

No external assets are used. Rendering is done via `Phaser.GameObjects.Graphics`.

-----

## main.ts Requirements

### Core Responsibilities
1. **Create a Phaser Game** with a single Scene.
2. In `create()`:
   - Instantiate the engine components.
   - Load the map data into the World.
   - Create Entity instances from the game layer's initial entity data.
   - Instantiate the GameScene and call `initialize(world, inputRouter, entities)`.
   - Instantiate the IsoRenderer with a Graphics object.
   - Start the GameLoop and on each tick:
     - Call `gameScene.update(delta)`
     - Call `isoRenderer.render()`
3. Ensure the game scales to the full window and responds to resize.

### Suggested Scene Structure
- `preload()` uses `AssetLoader` with an empty manifest (no assets needed).
- `create()` builds the world, entities, input router, game scene, renderer, and loop.
- `update()` can be unused if you rely on `GameLoop`.

### Screen Size Handling
- Use `window.innerWidth` / `window.innerHeight` for initial sizing.
- Handle `resize` events to update the Phaser scale and renderer origin.

-----

## README.md Requirements

Include:
- Project overview (1–2 paragraphs)
- Quick start commands:
  - `npm install`
  - `npm run dev`
- Short architecture summary (World + Entities + Game Loop + Phaser)
- How to play (tap a tile to move, tap an enemy to attack, win/lose condition)

Keep it lightweight and readable for new contributors.

-----

## What You Must Not Do

- Do not modify `src/types.ts`.
- Do not import `src/game/` from inside `src/engine/` or vice versa. Only `main.ts` may connect them.
- Do not add new npm dependencies.
- Do not introduce external assets.

-----

## When You Finish

Run `npm run dev` only if you need to sanity check behavior. Otherwise, no tests are required.

# Integration Agent

> DEPRECATED — This role existed to wire the initial prototype together. Keep for historical reference only.

## Your Job: Wire It All Together

You are the last agent to run. The Scaffolder + Shared Types, Engine Core, and Game Layer agents have already shipped their files. Your job is to write the entry point that imports from all three and produces a running application. You also write the README.

You produce exactly two files: `src/main.ts` and `README.md`.

---

## Context You Need

The project is a 2D isometric strategy game engine built on Phaser 3. It has three layers:

- **Scaffold** (Scaffolder + Shared Types Agent): project config, shared types in `src/types.ts`
- **Engine** (Engine Core Agent): five components in `src/engine/` — World, Entity, GameLoop, InputRouter, AssetLoader, IsoRenderer
- **Game** (Reference Game Agent): a demo tactical scenario in `src/reference-game/` — MapData, TurnManager, GameScene

Your job is simple: boot Phaser, create the engine components, create the game scene, wire them together, and start the loop. The engine and game already know how to do their jobs. You just introduce them.

---

## What Each Layer Exports

**From `src/engine/index.ts`:**
```typescript
World          // class — implements IWorld
Entity         // class — implements IEntity
GameLoop       // class — implements IGameLoop, wraps a Phaser Scene
InputRouter    // class — implements IInputRouter
AssetLoader    // class — implements IAssetLoader
IsoRenderer    // class — draws World + Entities each frame
gridToScreen   // function
screenToGrid   // function
TILE_W         // number (64)
TILE_H         // number (32)
```

**From `src/reference-game/index.ts`:**
```typescript
GameScene      // class — implements IGameScene
MAP_DATA       // TerrainType[][] — the map layout
ENTITY_SPAWNS  // EntitySpawnData[] — where entities start
```

**From `src/types.ts`:**
All shared interfaces. You will need `IEntity` for the entity list type. Note that `IGameScene.initialize` takes three arguments: `(world, inputRouter, entities)`.

---

## src/main.ts — The Boot Sequence

This file does the following, in order:

1. **Define a Phaser Scene class** that extends `Phaser.Scene`. This is the Scene that owns the game loop, the renderer, and the input. Call it `IsoScene` or similar.

2. **In the Scene's `create` method**, do the following in order:

   a. Create a `World` instance: `const world = new World(10, 10)`.

   b. Create the entity list. Iterate over `ENTITY_SPAWNS` and create an `Entity` for each one. Use a simple incrementing counter for ids. The Entity constructor signature is: `new Entity(id: string, type: string, position: EntityPosition, health?: number, maxHealth?: number)`. So for each spawn: `new Entity(String(i), spawn.type, { row: spawn.row, col: spawn.col }, spawn.health, spawn.maxHealth)`. Store them in an array: `const entities: IEntity[] = [...]`.

   c. Create the `InputRouter`: `new InputRouter(this, world, () => entities)`. The third argument is a getter — it returns the live array, not a snapshot, because entities get spliced out when they die.

   d. Create the `GameScene` instance and initialize it: `gameScene.initialize(world, inputRouter, entities)`. The entities array is passed directly — GameScene, InputRouter, and IsoRenderer all hold references to the same array. When GameScene splices a dead enemy out, everyone sees it.

   e. Create the `IsoRenderer`: `new IsoRenderer(this.add.graphics(), world, () => entities, this.cameras.main.width, this.cameras.main.height)`. Same getter pattern as InputRouter.

   f. The Scene's built-in `update` cycle is the game loop. No need to instantiate the `GameLoop` class separately — see the note below.

3. **In the Scene's `update` method**, do the following each frame:

   a. Call `gameScene.update(delta)` to let the game process its logic (turn management, win/lose checks).

   b. Call `isoRenderer.render()` (or equivalent) to redraw the world and entities.

   c. Check `gameScene.isOver()`. If the game is over, display a simple overlay message. Use a Phaser Text object. "YOU WIN" or "YOU LOSE" in large text, centered on screen. You only need to create this text once — check if it already exists before creating it again. Optionally add a "Tap to restart" message below it.

4. **Boot Phaser.** After defining the Scene class, create the Phaser Game config and start it:

```typescript
const config: Phaser.Types.GameConfig = {
  type: Phaser.AUTO,           // WebGL if available, Canvas fallback
  parent: 'game-container',    // matches the div id in index.html
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a2e',
  scene: [IsoScene]
}

new Phaser.Game(config)
```

**A note on GameLoop:** The Architecture doc specifies a GameLoop component. The Engine Core Agent built one. But Phaser Scenes already have a built-in update cycle (`create` → `update` loop). For this integration, the simplest correct approach is to use the Scene's native update cycle directly. The Scene's `update(time, delta)` method IS the loop. Use it.

---

## README.md

Write a README that covers:

- What this project is (one paragraph, no hype)
- How to run it (`npm install`, `npm run dev`)
- What the prototype demonstrates (the engine's five components in action, a playable tactical scenario)
- The mental model (World, Entities, Loop — three sentences max)
- The file structure (the `src/engine/` vs `src/reference-game/` boundary, and why it exists)
- A note that this is an ideation-stage prototype, MIT licensed

Keep it short. A developer should be able to read it in three minutes and understand what they're looking at.

---

## What You Must Not Do

Do not modify any file produced by the Scaffolder + Shared Types, Engine Core, or Game Layer agents. You only create `src/main.ts` and `README.md`.

Do not add npm dependencies.

Do not build game logic in main.ts. If something feels like it belongs in the game layer, it probably does. Main.ts is plumbing, not policy.

If something doesn't fit — if an interface is missing a method, or a constructor signature doesn't match what you need — leave a clear `// TODO:` comment explaining what's needed. Do not improvise a workaround that changes the contract.

# AGENT_REFACTOR_INTENT_ACTION.md
## Your Job: Decouple Player Input from State Mutation

This is a surgical refactor. The game already works. Your job is not to change what it does — it's to change *how* the mutations happen, so that a future multiplayer layer can intercept them.

Right now, `GameScene` receives a tile tap and immediately mutates state: it moves the player entity, reduces enemy health, splices dead enemies out of the array. The same is true on the enemy side — `TurnManager` directly mutates entity health and positions during the enemy turn.

After this refactor, neither of them mutates state directly. They produce *action objects* that describe what should happen. A single `applyAction` function receives those objects and performs the actual mutation. The behavior is identical in single-player. The difference is architectural: there is now a seam between "deciding what to do" and "doing it." That seam is where networking will live later.

---

## What You Must Not Do

Do not touch any file in `src/engine/`. Do not touch `src/main.ts`. Do not touch `MapData.ts` or `index.ts` in `src/game/`. Do not add npm dependencies. Do not change the external behavior of the game — same moves, same combat, same win/lose conditions, same turn order. A player running the game before and after this refactor should notice nothing.

Do not invent a class or module for the action system. It lives inside `GameScene.ts` as a type definition and a single function. Keep it flat.

---

## Context: The Current Mutation Sites

There are exactly four places in the current code where game state is mutated. All four move into `applyAction`. Nothing else changes.

**Mutation 1 — Player moves** (currently in GameScene's `onTileSelected` callback):
The player entity's `position` is set to the selected tile's coordinates.

**Mutation 2 — Player attacks** (currently in GameScene's `onTileSelected` callback):
An enemy entity's `health` is decremented by 1. If health reaches 0, the enemy is spliced out of the shared entity array.

**Mutation 3 — Enemy moves** (currently in TurnManager's enemy turn processing):
An enemy entity's `position` is set to a new tile.

**Mutation 4 — Enemy attacks** (currently in TurnManager's enemy turn processing):
The player entity's `health` is decremented by 1.

---

## The Action Types

Add these to `src/types.ts`. They go at the bottom, after the existing `IGameScene` interface. They are the only addition to that file.

```typescript
// ─── Game Actions (intent/action boundary for future multiplayer) ───────────

export type GameAction =
  | { kind: 'move';   entityId: string; to: EntityPosition }
  | { kind: 'attack'; attackerId: string; targetId: string }
  | { kind: 'remove'; entityId: string }
```

Three action kinds. That's all this game needs.

`move` — an entity changes position. `entityId` identifies who. `to` is where.

`attack` — one entity damages another. `attackerId` and `targetId` identify the combatants. The action does not carry damage amount — that's a rule, and rules stay in the logic layer. `applyAction` hardcodes 1 damage for now. When combat gets more complex, damage calculation happens *before* the action is produced, and the action type gains a `damage` field. But not today.

`remove` — an entity is removed from the shared array. This is a separate action, not bundled into `attack`, because the decision to remove happens *after* the attack resolves (health check). The logic layer produces an `attack`, checks the result, then conditionally produces a `remove`. This keeps each action atomic and makes the sequence visible.

---

## The applyAction Function

This lives in `GameScene.ts`, exported so `TurnManager` can import it. It is not a method on any class. It is a standalone function.

```typescript
export function applyAction(action: GameAction, entities: IEntity[]): void
```

It receives the action and the shared entity array. It does exactly one thing per action kind, nothing more:

For `move`: find the entity by `action.entityId` in the array. Set its `position` to `action.to`. If the entity is not found, do nothing (don't throw).

For `attack`: find the target entity by `action.targetId`. Decrement its `health` by 1. If the entity is not found, do nothing.

For `remove`: find the entity by `action.entityId`. Splice it out of the array. If not found, do nothing.

No logging. No side effects. No win/lose checks — those stay in `GameScene.update()` where they already are. This function is a dumb executor. It does what it's told.

---

## How GameScene Changes

The `onTileSelected` callback currently has inline mutation logic. Replace it with action production + application. The validation logic stays exactly where it is — adjacency checks, passability checks, occupancy checks. None of that moves. What changes is the end of each branch.

**Before (player move):**
```
// validation passes, tile is empty and passable
player.position = { row: selectedRow, col: selectedCol }
if (tile is goal) mark win
turnManager.playerActed()
```

**After (player move):**
```
// validation passes, tile is empty and passable
applyAction({ kind: 'move', entityId: player.id, to: { row: selectedRow, col: selectedCol } }, this.entities)
if (tile is goal) mark win
turnManager.playerActed()
```

**Before (player attack):**
```
// validation passes, enemy occupies the tile
enemy.health! -= 1
if (enemy.health! <= 0) splice enemy out of array
turnManager.playerActed()
```

**After (player attack):**
```
// validation passes, enemy occupies the tile
applyAction({ kind: 'attack', attackerId: player.id, targetId: enemy.id }, this.entities)
if (enemy.health! <= 0) {
  applyAction({ kind: 'remove', entityId: enemy.id }, this.entities)
}
turnManager.playerActed()
```

Note: the health check after attack reads from the entity directly — `applyAction` already mutated it. The check is still logic, not mutation. It just conditionally produces another action.

The win check (`if tile is goal`) stays where it is. It reads state, it doesn't change it.

---

## How TurnManager Changes

`TurnManager` currently mutates entity positions and health directly during enemy turn processing. It needs access to `applyAction` and the entity array to produce and apply actions instead.

**Constructor change:** `TurnManager` already receives the entity array. It now also needs `applyAction`. The cleanest way: import `applyAction` directly from `GameScene.ts`. It's in the same `src/game/` directory. This is an intra-game-layer import — not a cross-boundary import — so it's fine.

```typescript
import { applyAction } from './GameScene'
```

**Enemy move (before):**
```
enemy.position = { row: newRow, col: newCol }
```

**Enemy move (after):**
```
applyAction({ kind: 'move', entityId: enemy.id, to: { row: newRow, col: newCol } }, this.entities)
```

**Enemy attack (before):**
```
player.health! -= 1
```

**Enemy attack (after):**
```
applyAction({ kind: 'attack', attackerId: enemy.id, targetId: player.id }, this.entities)
```

The enemy AI logic — Manhattan distance heuristic, adjacency check, passability check — stays exactly where it is. Only the final mutation step changes.

---

## Files You Modify

```
src/types.ts          ← add GameAction type at the bottom
src/game/GameScene.ts ← add applyAction function, refactor onTileSelected callback
src/game/TurnManager.ts ← import applyAction, refactor enemy move and attack
```

Three files. No new files. No deleted files. No changes to engine code or main.ts.

---

## Verification

After the refactor, mentally trace a full turn cycle and confirm the sequence is still correct:

1. Player taps a tile. `onTileSelected` fires.
2. Validation runs (adjacency, passability, occupancy). Same as before.
3. If move: `applyAction({ kind: 'move', ... })` runs. Player position updates. If goal tile, win flag sets. `playerActed()` called.
4. If attack: `applyAction({ kind: 'attack', ... })` runs. Enemy health decrements. Health check runs. If zero, `applyAction({ kind: 'remove', ... })` runs. Enemy spliced out. `playerActed()` called.
5. Turn flips to ENEMY_TURN. TurnManager processes each enemy.
6. Enemy AI decides: move or attack. Produces action. `applyAction` runs. Position or health updates.
7. All enemies processed. Turn flips to PLAYER_TURN.
8. `GameScene.update()` checks win/lose. Same as before.

The sequence is identical. The only difference is that every state change now passes through `applyAction`. That function is the seam. When multiplayer arrives, networking replaces the direct call to `applyAction` on the client side — the client sends the action to a server, the server validates and applies it, and pushes the result back. But that's not today's problem. Today's job is just making the seam visible.
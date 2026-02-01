# Engine Contributing Guide

## Public API imports only
- Treat `src/engine/index.ts` as the public API surface.
- Consumers (including the reference game and `src/main.ts`) must import engine classes from `src/engine/index.ts`, not deep engine paths.

## Reference game = consumer harness
- `src/reference-game/` is a small, playable harness that exercises the engine.
- It should never import from `src/engine/`; it only uses `src/types.ts` for shared contracts.

## Architectural invariants (must stay true)
- The game layer must not import the engine layer.
- The shared `entities` array is mutated in place, never replaced.
- `TurnManager` stays dumb: no world/entities/AI.
- `infoPanel` is derived display state; do not serialize it.
- Map terrain is a module-level constant; do not serialize it.

## Checks
- `npm run typecheck`
- `npm run sanity`

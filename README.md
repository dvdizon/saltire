# Saltire

Saltire is a 2D isometric strategy game engine prototype built with Phaser 3 and TypeScript. The goal is to prove that a developer can stand up a playable, grid-based tactical scenario quickly while keeping the engine's mental model simple and explicit.

## Running the prototype

```bash
npm install
npm run dev
```

## Quick checks

```bash
npm run typecheck
npm run sanity
```

## Worktrees

Use the helper script to create a worktree and copy `node_modules` when available:

```powershell
.\scripts\create-worktree.ps1 -Description docs-cleanup -Remote origin -BaseBranch main
```

Or on bash environments:

```bash
./scripts/create-worktree.sh docs-cleanup origin main
```

## How to play the demo

- Click/tap an adjacent tile to move (no diagonals).
- Click/tap an adjacent enemy to attack.
- Click/tap the info icon in the bottom-left to show the info panel.
- Click/tap the X in the panel to hide it.
- Each move or attack ends your turn; enemies act right after.
- Win by defeating all enemies; lose if your player reaches 0 health.
- Refresh the page to restart after a win or loss.

## What this prototype demonstrates

- The five engine components (World, Entity, GameLoop, InputRouter, AssetLoader) working together.
- A playable tactical scenario on top of the engine (grid, turns, combat, win/lose).
- A thin integration layer that boots the engine and the game without entangling their logic.

## Mental model

The World is a grid of tiles. Entities live on the grid. The loop updates the world and entities, then renders the isometric view each frame.

## File structure

- `src/engine/` contains engine primitives that stay game-agnostic.
- `src/game/` contains the demo scenario and game-specific logic.

This separation keeps the engine reusable and the game layer free to evolve without rewiring core systems.

## Status

This is an ideation-stage prototype released under the MIT license.

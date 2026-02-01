# Changelog

All notable changes to this project will be documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- None.

## [0.1.0] - 2026-02-01

### Added
- Initial isometric prototype scaffolding with Phaser 3 and TypeScript.
- Drag panning and camera-anchored HUD/end overlay.
- Procedural biome refinement and fog-of-war.
- Persistent minimap exploration.
- Player info panel and audio toggle UI.
- Snapshot logging and deterministic replay support.
- Project branding logo asset.
- Worktree helper scripts for agent workflows.

### Changed
- Game state mutations now follow an intent/action pattern.
- Engine API boundary clarified to improve usability.
- Agent workflow guidance reorganized for clarity.

### Fixed
- View remains centered on window resize.
- Touch drag now works on the canvas.
- Action logs record only applied actions.
- Replay results derive from authoritative entity state.
- Snapshot restore lifecycle is guarded against invalid transitions.
- Missing entity factory now fails fast with a clear error.

### Documentation
- Added inline code comments in engine/game layers.
- Added PR description formatting guidance for GitHub CLI usage.
- Deprecated one-time agent instructions and clarified worktree requirements.

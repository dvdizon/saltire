# Execution Plan: Engine Backport Skill

**Date:** 2026-02-14  
**Status:** Completed

## Goal
Create a reusable, repo-local skill that helps developers backport engine changes from a game repository into the public Saltire engine repository without leaking game-specific details.

## Why this is needed
- Scorched Galaxy began as a copy of Saltire and now contains substantial engine updates.
- Direct cherry-picks are risky because commits may include game-layer references.
- Teams need a repeatable method for extracting only engine-safe changes.

## Deliverables
- [x] A reusable skill at `skills/engine-backport-sync/`.
- [x] A helper script to generate a backport patch from allowlisted engine paths.
- [x] Built-in leakage checks for game-specific references before sharing patches.
- [x] A PR body template for the public Saltire repository.

## Scope decisions
- [x] Include only engine-allowlisted paths by default:
  - `src/engine`
  - `src/types.ts`
  - `README.md`
  - `ENGINE_CONTRIBUTING.md`
  - `docs/saltire-engine`
- [x] Exclude game paths by default (`src/reference-game`, game assets, game docs).
- [x] Fail fast when potential game terms are detected in the patch.

## Workflow summary
1. Generate patch from allowlisted paths only.
2. Scan resulting patch for denylisted game terms and paths.
3. Apply patch in Saltire public repo with `git am --3way`.
4. Run validation in Saltire repo.
5. Open PR using included template and command checklist.

## Validation expectations
- Backport patch creation is deterministic and repeatable.
- Patch sharing is blocked when game-sensitive terms appear.
- PR validation section records pass/fail per command.

## Notes
This plan intentionally focuses on a reusable process artifact (skill + script) so the same workflow can be copied into `github.com/dvdizon/saltire` and reused by any downstream game project.

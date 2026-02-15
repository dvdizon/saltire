---
name: engine-backport-sync
description: Build a safe backport patch from a downstream game repo to Saltire by exporting only allowlisted engine files, scanning for game-specific leaks, and preparing a clean PR handoff.
---

# Engine Backport Sync

Use this skill when a game repo is based on Saltire and you need to upstream engine improvements without exposing game implementation details.

## Inputs
- `PUBLIC_ENGINE_REPO`: local path to `github.com/dvdizon/saltire` clone.
- `BASE_REF`: Saltire-compatible base ref (for example `origin/main`).
- Optional extra include paths when intentionally backporting docs or shared non-game tools.

## Guardrails
- Never include `src/reference-game/` or game-specific assets in backport patches.
- Default include list:
  - `src/engine`
  - `src/types.ts`
  - `README.md`
  - `ENGINE_CONTRIBUTING.md`
  - `docs/saltire-engine`
- Use leak scanning before patch handoff.

## Procedure
1. From the game repo, generate a patch:
   - `./skills/engine-backport-sync/scripts/create_backport_patch.sh --base-ref <BASE_REF> --output /tmp/saltire-backport.patch`
2. Review patch summary and leak-scan output.
3. In `PUBLIC_ENGINE_REPO`, apply:
   - `git checkout -b chore/backport-<date>`
   - `git am --3way /tmp/saltire-backport.patch`
4. Run Saltire validation commands.
5. Open PR in Saltire using template at `skills/engine-backport-sync/templates/backport-pr-body.md` (includes CI merge-gate checkboxes).

## Promote this skill to the public Saltire repo
1. Copy `skills/engine-backport-sync/` into the Saltire repository root.
2. Add a short mention in Saltire's contributor docs pointing to this skill.
3. Keep the denylist and allowlist aligned with Saltire's evolving folder structure.

## Recommended validation
- `npm run typecheck`
- `npm run sanity`
- Engine-focused tests if present.

## Failure handling
- If leak scan fails, remove offending hunks or narrow include paths and regenerate patch.
- If `git am` conflicts, resolve manually and keep commit history focused on engine concerns only.

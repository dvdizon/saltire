## Summary
- Backport engine-layer changes from downstream game repository.
- Patch was generated from allowlisted engine paths only.
- Leak scan passed (no game-specific paths or terms detected).

## Motivation
- Keep Saltire public engine aligned with validated improvements from production usage.
- Preserve game/repo confidentiality while sharing reusable engine capabilities.

## Validation
- ✅ npm run typecheck
- ✅ npm run sanity

## Notes
- Generated using `engine-backport-sync` workflow.
- Any conflicts were resolved in favor of engine-generic behavior.

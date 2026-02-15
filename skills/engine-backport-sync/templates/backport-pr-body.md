## Summary
- Backport engine-layer changes from downstream game repository.
- Patch was generated from allowlisted engine paths only.
- Leak scan passed (no game-specific paths or terms detected).

## Motivation
- Keep Saltire public engine aligned with validated improvements from production usage.
- Preserve game/repo confidentiality while sharing reusable engine capabilities.

## Validation
- [x] `npm run test`
- [x] `npm run typecheck`
- [x] `npm run sanity`
- Use `[-]` instead of `[x]` for any failed command.

## Merge Gate
- [x] I confirm CI checks are green (`test`, `typecheck`, `sanity`).
- [x] I confirm this PR targets `main` from a feature branch (no direct push to `main`).

## Notes
- Generated using `engine-backport-sync` workflow.
- Any conflicts were resolved in favor of engine-generic behavior.

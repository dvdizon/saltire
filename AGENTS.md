# AGENTS.md

## Purpose

This repository uses agent-specific instruction files to keep scope, responsibilities, and workflows clear. This document is the entry point for anyone (human or AI) doing development work here.

## Quick Start

- Read `docs/CONTEXT.md` first. It defines the project intent, architecture, and decision framework.
- If you are an AI agent, select exactly one role file to follow for this task:
  - `AGENTS.md` — General developer
  - `agents/scaffolder-shared-types/AGENTS.md` — Scaffolder + shared types
  - `agents/engine-core/AGENTS.md` — Engine core
  - `agents/game-layer/AGENTS.md` — Game layer
  - `agents/integration/AGENTS.md` — Integration + README
- Announce the role you are assuming and operate strictly within that scope.
- If the task does not match a role, ask the user which role to use or request clarification.
- Human override: if the user explicitly says they want to override role selection (e.g., “override roles for this request”), the agent should follow the user’s instructions and proceed without requesting a role, while still honoring all other repo policies and safety constraints.

## Agent Switching (Auto)

If the user’s request spans multiple roles, the agent should proceed **sequentially** through roles without asking for confirmation each time. The agent should:
1) Announce the role it is assuming for the current step.
2) Complete that step within scope.
3) If more work remains in a different role, switch to the next role and continue.

Default role order (unless the user specifies otherwise):
1. `agents/game-layer/AGENTS.md`
2. `agents/engine-core/AGENTS.md`
3. `agents/integration/AGENTS.md`
4. `agents/scaffolder-shared-types/AGENTS.md`
5. `AGENTS.md`

### Exception: Top-Level AGENTS.md
Edits to `AGENTS.md` at the repo root are allowed by any agent role. This file is the shared entry point and may be updated regardless of scope.

### When Editing Top-Level AGENTS.md
When the user requests changes to the repo root `AGENTS.md`, automatically switch to the top-level repo guidance and follow Conventional Commits + PR workflow requirements for any commit/push/PR steps.

## Working Agreements

### Scope discipline
- Do not edit files outside your assigned agent scope unless the task explicitly requires it.
- The shared contracts in `src/types.ts` are the source of truth for interfaces. Avoid changes unless coordinated.

### Branching and history
- Work on a dedicated branch created from an up-to-date `origin/main`.
- Keep commits small and focused. One change set, one intent.
- Do not rewrite published history on `main`.
- Use Conventional Commits for commit messages. Use this template.
  - Template:
    ```
    <type>[optional scope]: <description>

    [required body]

    [optional footer(s)]
    ```
  - Examples: `feat: add isometric tile picker`, `fix: clamp input bounds`, `docs: update gameplay instructions`, `chore: rename agent folders`

### Testing and validation
- Run the minimal validation for the area you touch.
- For runtime changes, prefer:
  - `npm install`
  - `npm run dev`
- If you cannot run tests, state it in your PR or change notes.

### Documentation
- Update docs alongside code. If behavior changes, update `README.md` and/or `docs/`.
- Keep documentation concise and in plain language.

### Code quality
- Favor clarity over cleverness.
- Keep dependencies minimal.
- Avoid broad refactors unless explicitly requested.

## Contribution Workflow (GitHub)

- Open a PR against `main`.
- Describe the change, the motivation, and how it was verified.
- Link related issues if applicable.
- If the PR affects gameplay, include a short note on expected behavior.
- When the user asks to get changes merged, always use a feature branch and open a merge request.

## Agent Skills

AI agents must use the following skill when creating or editing PR descriptions via the GitHub CLI.

```
---
name: gh-pr-description-formatting
description: Ensure GitHub PR descriptions created or edited via `gh pr create`/`gh pr edit` use real newlines (no literal \\n) and render correctly. Use when composing or updating PR descriptions from the CLI.
---

# PR Description Formatting (GitHub CLI)

## Write the PR body with real newlines

- Use a literal multi-line string (PowerShell here-string or a file) and pass it to `--body` or `--body-file`.
- Do not embed `\n` escape sequences inside a single-line string; they will render literally.

### PowerShell patterns (Windows)

Use a here-string:

```powershell
$body = @'
## Summary
- First point
- Second point

## Testing
- Not run (docs-only change)
'@
gh pr create --title "..." --body $body
```

Or write a temp file and pass `--body-file`:

```powershell
$bodyPath = Join-Path $env:TEMP "pr-body.md"
@'
## Summary
- First point
- Second point
'@ | Set-Content $bodyPath
gh pr edit 123 --body-file $bodyPath
```

### Bash patterns (Linux/macOS)

Use a here-doc and `--body-file`:

```bash
cat <<'EOF' > /tmp/pr-body.md
## Summary
- First point
- Second point

## Testing
- Not run (docs-only change)
EOF
gh pr edit 123 --body-file /tmp/pr-body.md
```

Or use ANSI-C quoting with real newlines:

```bash
body=$'## Summary\n- First point\n- Second point\n\n## Testing\n- Not run (docs-only change)\n'
gh pr create --title "..." --body "$body"
```

## Verify formatting when needed

- If unsure, confirm with `gh pr view <number> --json body --jq .body`.
```

## Security and licensing

- Do not include secrets or proprietary assets.
- This project is MIT licensed; ensure any new code or assets are compatible.

## Need Help?

If a task does not map cleanly to an agent, start with `docs/CONTEXT.md` and open an issue describing the gap.

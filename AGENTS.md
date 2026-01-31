# AGENTS.md

## Purpose

This repository uses agent-specific instruction files to keep scope, responsibilities, and workflows clear. This document is the entry point for anyone (human or AI) doing development work here.

## Quick Start

- Read `docs/CONTEXT.md` first. It defines the project intent, architecture, and decision framework.
- If you are an AI agent, select exactly one role file to follow for this task:
  - `agents/scaffolder-shared-types/AGENTS.md` — Scaffolder + shared types
  - `agents/engine-core/AGENTS.md` — Engine core
  - `agents/game-layer/AGENTS.md` — Game layer
  - `agents/integration/AGENTS.md` — Integration + README
- Announce the role you are assuming and operate strictly within that scope.
- If the task does not match a role, ask the user which role to use or request clarification.

## Working Agreements

### Scope discipline
- Do not edit files outside your assigned agent scope unless the task explicitly requires it.
- The shared contracts in `src/types.ts` are the source of truth for interfaces. Avoid changes unless coordinated.

### Branching and history
- Work on a dedicated branch created from an up-to-date `origin/main`.
- Keep commits small and focused. One change set, one intent.
- Use Conventional Commits for commit messages.
- Do not rewrite published history on `main`.
  - Template:
    ```
    <type>[optional scope]: <description>

    [optional body]

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

## Security and licensing

- Do not include secrets or proprietary assets.
- This project is MIT licensed; ensure any new code or assets are compatible.

## Need Help?

If a task does not map cleanly to an agent, start with `docs/CONTEXT.md` and open an issue describing the gap.

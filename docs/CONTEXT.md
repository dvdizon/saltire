# CONTEXT.md
## Saltire — 2D Isometric Game Engine — Project Entry Point

Read this first. Everything else in this project defers to it.

---

## Repository Structure

```
saltire/
├── docs/                       # You are here
│   ├── CONTEXT.md              ← Start here
│   ├── PRD_Game_Engine.md      ← What and why
│   ├── Architecture_Engineering_Doc.md  ← How
│   ├── BUILD_PLAN.md           ← Execution plan
│   └── deprecated-agents/      # Deprecated agent instructions
│       ├── scaffolder-shared-types-agent.md
│       └── integration-agent.md
├── src/
│   ├── types.ts                # Shared type definitions
│   ├── engine/                 # Core engine components
│   │   └── AGENTS.md            # Engine core agent instructions
│   │   ├── World.ts
│   │   ├── Entity.ts
│   │   ├── GameLoop.ts
│   │   ├── InputRouter.ts
│   │   ├── AssetLoader.ts
│   │   ├── IsoRenderer.ts
│   │   └── index.ts
│   ├── game/                   # Game-layer code
│   │   └── AGENTS.md            # Game layer agent instructions
│   │   ├── MapData.ts
│   │   ├── TurnManager.ts
│   │   ├── GameScene.ts
│   │   └── index.ts
│   └── main.ts                 # Entry point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## The Two Guiding Documents

All product and engineering decisions in this project are made against two documents. They are not suggestions. They are the filter.

**[PRD_Game_Engine.md](./PRD_Game_Engine.md)** — Defines *what* we're building and *why*. If a decision affects scope, priorities, or the product direction, this is where the answer lives. The north star is outcome 4.1: a developer can build a playable prototype in under a week.

**[Architecture_Engineering_Doc.md](./Architecture_Engineering_Doc.md)** — Defines *how* we're building it. If a decision affects system structure, component design, or where logic lives, this is where the answer lives. The north star is the mental model: World, Entities, Loop, on top of Phaser. If you can't explain a proposed change in terms of that model, it's probably too complicated.

---

## The Decision Framework

When evaluating any feature, change, or addition — ask these questions in order:

1. **Does this belong in the engine or in the game layer?** The boundary is defined in the Architecture doc under "What Lives in the Engine vs. What Lives in the Game." If it's game-specific logic, it stays out of the engine. No exceptions.

2. **Does this make iteration faster, or does it make the system harder to understand?** The PRD's priority order is explicit: iteration speed first, mental model simplicity second, flexibility third. When they conflict, the order wins.

3. **Does a new developer still understand the system after this change?** If someone unfamiliar with the project can't read the Architecture doc and explain how the piece fits, the change is too opinionated or too complex for the engine layer.

---

## What's Currently True

- **Status:** Ideation. Nothing is built yet. Architecture is being defined, not validated.
- **Team:** Two developers. Decisions should optimize for speed at this stage.
- **Platform:** Mobile web primary. Desktop secondary, becomes more important as complexity grows.
- **Stack:** Phaser 3 (MIT) + TypeScript + Vite. All MIT or equivalent.
- **The engine is open-source from day one.** Structure, conventions, and documentation should reflect that from the start.

---

## How to Use This Project

When working in this project — whether you're writing code, designing a feature, or working through a technical decision — treat the PRD and Architecture doc as the source of truth. If something you're considering isn't addressed by either document, that's a signal: either it belongs in the game layer (not here), or it's a gap worth calling out before moving forward.

Don't add complexity to the engine to solve a problem that only one game needs. Don't make the mental model harder to hold in order to gain flexibility nobody has asked for yet.

The engine earns its place by being fast to learn and fast to build on. Everything else follows from that.

---

## Agent Instructions

Active agent instructions live alongside the code they govern:

- `src/engine/AGENTS.md` — Core engine implementation
- `src/game/AGENTS.md` — Game-layer implementation

Deprecated agent instructions live in `docs/deprecated-agents/`:

- `docs/deprecated-agents/scaffolder-shared-types-agent.md` — Project scaffolding and setup
- `docs/deprecated-agents/integration-agent.md` — Integration and testing

Each agent doc defines scope, responsibilities, and constraints for that role. Agents should read their specific doc along with this context and the two guiding documents.

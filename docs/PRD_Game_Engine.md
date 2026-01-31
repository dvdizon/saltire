# Product Requirements Document
## Saltire — 2D Isometric Game Engine
**Status:** Ideation
**Date:** January 2026
**Authors:** David Dizon

---

## 1. Vision

The killer app for this engine isn't the games it produces. It's the speed at which a small team can go from idea to playable. Most game engines optimize for power. This one optimizes for productivity — and does it without sacrificing the flexibility that more ambitious projects will eventually need.

The target state: two developers can take a game concept in the vein of *Into the Breach* or *FTL* and have a working, playable prototype in days, not weeks. The engine handles the scaffolding. The developers focus on the decisions that actually matter — game design, feel, and strategy.

---

## Why Saltire

The name comes from heraldry. A saltire is the X-shaped cross — but look at an isometric tile from above and that's exactly what you see. The diamond shape that is the visual signature of everything this engine draws.

We wanted a name that didn't try to sell the engine. No "rapid," no "swift," no telegraphing the speed story in the title. The speed is the point, but it's something you discover the moment you start using it — not something you need to be told upfront. The name should reward a developer who actually looks at what they're building on, not one who's just reading a README.

Saltire does that. It's specific to isometric grids without being obvious about it. Once you see the connection, it sticks.

---

## 2. Who This Is For

**Now:** A two-person team building 2D isometric strategy and roguelike-adjacent games for the web. Speed of iteration is the top priority. Every decision the engine makes should reduce the time between "I have an idea" and "I can play it."

**Later:** A broader developer community. The architecture and conventions established here need to be learnable quickly. If a software engineer can't form a working mental model of the system within an hour of reading the docs, we've overcomplicated something.

---

## 3. Platform and Technology Constraints

The primary target is **mobile web**, with a responsive desktop view as a secondary target. Desktop becomes more important as game complexity increases — richer UIs, more input options, longer sessions.

The engine is built on top of **Phaser 3**, which is MIT-licensed, purpose-built for 2D browser games, and has first-class support for isometric projection via its plugin ecosystem. Phaser handles rendering, input, asset loading, and physics. This engine adds the layers on top that make building *isometric strategy games specifically* fast and opinionated.

The engine itself will be open-source under the MIT license.

---

## 4. Desired Outcomes

These are the outcomes that define success — not feature lists, but the experience we're optimizing for.

### 4.1 A developer can build a playable prototype in under a week

This is the north star. If the engine consistently delivers this, everything else is secondary. It means the engine must come with sensible defaults for isometric rendering, turn/action flow, tile-based or grid-based maps, and basic entity behavior — without requiring the developer to wire any of that together from scratch.

### 4.2 The mental model is simple enough to teach in an afternoon

Complexity is the enemy of adoption. The core concepts of the engine — how a world is structured, how entities live inside it, how a turn or action flows — need to map onto ideas any experienced software engineer already understands. No proprietary abstractions that require days of onboarding.

### 4.3 Iteration is frictionless

Changing a map layout, tweaking entity behavior, swapping out a sprite, adjusting game rules — none of these should require touching engine internals. The boundary between "engine code" and "game code" should be clean and obvious.

### 4.4 Mobile-first, but not mobile-only

The engine renders and performs well on mobile browsers without special-casing. But it doesn't artificially constrain what's possible on desktop. As a game grows in scope, the developer can layer in desktop-specific features — richer menus, keyboard shortcuts, more complex UIs — without hitting a wall.

### 4.5 The codebase is open-source friendly from day one

This isn't a "we'll open-source it later" situation. The engine is structured, documented, and licensed for contribution from the start. The conventions and architecture should make it easy for a new contributor to understand what's happening and where to make changes.

---

## 5. What This Engine Is Not

It's worth being explicit about the boundaries.

This is not a general-purpose 2D game engine. It's opinionated toward isometric, tile-based, turn-oriented strategy and roguelike games. If you're building a platformer or a real-time shooter, Phaser alone is probably the better starting point.

This is not a no-code tool. It assumes the developer can write JavaScript or TypeScript. The productivity gains come from good abstractions and conventions, not from removing code entirely.

This is not a production-hardened, battle-tested platform on day one. It's an ideation-stage project. The architecture needs to be right. The polish comes later.

---

## 6. Success Criteria

| Outcome | How We'll Know We Got It Right |
|---|---|
| Prototype speed | First internal game prototype ships within one week of engine being functional |
| Mental model clarity | A developer unfamiliar with the project can read the architecture doc and explain the system back accurately |
| Iteration speed | A game rule change or map swap takes less than 30 minutes from decision to playable |
| Mobile performance | Target game runs at 60fps on a mid-range mobile device in a mobile browser |
| Open-source readiness | A contributor can find, understand, and modify any module without asking for context |

---

## 7. Priorities and Tradeoffs

The engine will face constant pressure to add features. The decision framework is straightforward: does this make the next game faster to build, or does it make the engine harder to understand? If it's the latter, it doesn't belong in the engine — it belongs in the game layer on top.

**Priority 1:** Speed of iteration for the first two developers.
**Priority 2:** Simplicity of mental model for future contributors.
**Priority 3:** Flexibility to support more complex games down the road.

When these conflict, the order above wins.

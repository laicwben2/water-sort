# Water Sort

A polished, mobile-first Water Sort Puzzle built with React, TypeScript, and Vite. The production v2 levels are deterministic and generated from solved boards using reversible transformations, so every puzzle ships with a known legal solution path. A v3 offline catalog pipeline is under evaluation to replace runtime generation with pre-solved balanced shuffles.

## Features

- Seeded Level Mode with reproducible Easy, Medium, and Hard puzzles
- Random Game mode for a fresh seeded puzzle on demand
- Rule-correct multi-layer pours with clear invalid-move feedback
- Undo, restart, next-level, and replay flows
- Move counter, timer, per-level best moves, and best time
- Full in-progress game restoration after reload using `localStorage`
- Responsive touch-first layout with desktop support
- System-aware Light and Dark modes with a manual theme cycle
- Selection, pouring, receiving, invalid-move, and completion animations
- Centralized English UI strings ready for future localization

## How to play

1. Select a non-empty source tube.
2. Select an empty tube or a tube whose top color matches the source.
3. The largest possible contiguous block of the source's top color is poured.
4. Complete the level by making every non-empty tube both full and single-colored.

## Solvable puzzle generation

The generator does not shuffle liquid layers arbitrarily. It starts from a solved board and applies deterministic reverse transformations. Each transformation is accepted only when its inverse is a legal forward Water Sort move. Replaying those inverses in reverse order therefore provides a proof of solvability.

Generation also rejects solved, short, low-transition, and insufficiently mixed boards. The v2 Classic generator accepts only boards with the configured number of empty tubes and every other tube filled to capacity. Difficulty changes color count, transformation depth, and minimum complexity—not only the number of colors. A seeded PRNG makes every `difficulty + level number` combination reproducible, while saved v1 games retain their original board and seed.

The current behavior, uneven starting fill levels, product tradeoffs, and the proposed Classic generator roadmap are documented in [`docs/level-generation-design.md`](docs/level-generation-design.md). The measured 3,000-level v1 baseline is available in [`docs/generator-baseline.md`](docs/generator-baseline.md).

The v3 prototype uses canonical board keys and a bounded A* solver entirely during development. It tests the same randomly filled color layout with different empty-tube counts, stores only verified solutions, and is not included in the browser runtime. See [`docs/offline-catalog-v3.md`](docs/offline-catalog-v3.md).

## Tech stack

- React
- TypeScript
- Vite
- CSS
- Vitest
- Lucide React

## Local development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Tests

```bash
npm run test
```

The suite covers move validation, contiguous pours, limited capacity, undo, win detection, deterministic seeds, generated-board validity, unsolved starts, and replaying each generated puzzle's guaranteed solution.

Offline catalog development commands:

```bash
npm run generate:catalog -- --per-difficulty=20
npm run validate:catalog
npm run generate:catalog:expanded -- --per-difficulty=20
```

These commands run the expensive solver before deployment. The baseline profile uses 4/5/6 colors; the expanded profile uses 5/6/7 colors for Easy/Medium/Hard. They are not part of the production build or gameplay path.

## Production build

```bash
npm run build
```

The static production output is written to `dist/`.

## Deployment

The project is configured for Vercel. Import the GitHub repository, keep `main` as the production branch, and use the detected Vite defaults:

- Build command: `npm run build`
- Output directory: `dist`

## Project structure

```text
src/
├── components/       Game board, tubes, controls, and completion dialog
├── game/             Rules, generators, canonical keys, solver, state, and persistence
├── hooks/            UI preference hooks
├── i18n/             Centralized interface strings
├── utils/            Formatting helpers
├── App.tsx            Product composition and interaction animation state
└── styles.css         Responsive light/dark visual system
scripts/               Generator analysis and offline catalog tooling
data/levels/           Versioned solver-verified catalog prototypes
```

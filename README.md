# Water Sort

A polished, mobile-first Water Sort Puzzle built with React, TypeScript, and Vite. Official levels are produced offline by the separate `water-sort-level-generator` project and consumed here through a versioned, solver-verified static Level Pack.

## Features

- Static Level Mode with solver-verified Easy, Medium, and Hard puzzles
- Random Game mode that selects from the same verified level pool
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

## Level architecture

Official puzzle generation lives in the separate [`water-sort-level-generator`](https://github.com/laicwben2/water-sort-level-generator) project. The generator owns candidate creation, A* solving, canonical deduplication, difficulty analysis, validation, and export. This repository owns gameplay, persistence, UI, and loading already-generated levels.

The compatibility boundary is **Level Pack v1**:

- `formatVersion` versions the JSON structure.
- `rulesVersion` versions gameplay semantics.
- Runtime packs contain only playable level data and small consumer-facing metadata.
- Solver solutions, search metrics, canonical keys, source seeds, and other audit data stay in the generator project.

The current migration pack contains 40 solver-verified levels per difficulty, derived from the existing v3 baseline and expanded prototypes. It is a migration/prototype pack rather than the final production-sized catalog.

See:

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/level-format-v1.md`](docs/level-format-v1.md)
- [`docs/repository-split.md`](docs/repository-split.md)
- [`spec/level-pack-v1.schema.json`](spec/level-pack-v1.schema.json)

Generator/solver authoring code is intentionally absent from this repository. The web runtime does not solve or generate official puzzles on the player's device.

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

The suite covers move validation, contiguous pours, limited capacity, undo, win detection, persistence, stable record identity, and Level Pack loading/validation. Generator and solver tests live in the separate generator repository.

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
├── game/             Runtime rules, state, and persistence
├── levels/           Level Pack parser, validation, and generated runtime catalog
├── hooks/            UI preference hooks
├── i18n/             Centralized interface strings
├── utils/            Formatting helpers
├── App.tsx            Product composition and interaction animation state
└── styles.css         Responsive light/dark visual system
spec/                  Cross-project Level Pack contract
```

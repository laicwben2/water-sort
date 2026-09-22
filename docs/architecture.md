# Water Sort architecture

Date: 2026-09-22

## Decision

Water Sort is split into two independently useful projects.

1. **water-sort** — a game client. It renders and plays already-generated levels. It owns UI, persistence, player interaction, animation, records, and the runtime implementation of the Water Sort rules.
2. **water-sort-level-generator** — an offline content-authoring tool. It creates candidate boards, solves them, evaluates difficulty, removes duplicates, validates invariants, and exports versioned level packs.

The projects communicate only through a versioned data contract: **Level Pack v1**.

The generator must not depend on React, browser APIs, localStorage, Vercel, or any game UI. The game must not execute the solver or generate official levels at runtime.

## Boundary

```text
water-sort-level-generator
  candidate generation
  solver
  canonicalization
  difficulty analysis
  deduplication
  validation
  export
          |
          | Level Pack v1 JSON
          v
water-sort
  level-pack validation
  level selection
  game rules
  persistence
  UI / animation
  records
```

This makes the generator reusable for the web client, iOS, Android, Unity, or any future consumer that implements the same `rulesVersion`.

## Contract versions

`formatVersion` versions the JSON structure.

`rulesVersion` versions gameplay semantics. A consumer must reject a pack whose rules version it does not support rather than silently interpreting it differently.

Current values:

- `formatVersion: 1`
- `rulesVersion: "classic-v1"`

See `docs/level-format-v1.md` and `spec/level-pack-v1.schema.json`.

## Runtime data versus audit data

The generator keeps two different outputs.

**Audit catalog** contains solver solutions, canonical keys, explored-state counts, empty-tube trials, path metrics, source seeds, and other authoring information.

**Runtime pack** contains only what consumers need to play a level: stable ID, difficulty, capacity, board, and small optional metadata such as optimal move count.

Solver internals are intentionally excluded from the game bundle.

## Repository ownership

### water-sort

Owns:

- `src/game/rules.ts`
- `src/game/useGame.ts`
- `src/game/persistence.ts`
- UI components, hooks, i18n, styles
- `src/levels/` runtime pack parser and generated pack
- Level Pack contract documentation mirrored for consumer development

Must not own long-term:

- A* solver
- cross-puzzle canonicalization
- candidate generation
- generator analysis scripts
- audit catalogs

### water-sort-level-generator

Will own:

- solver and solver tests
- canonical state/puzzle keys
- seeded RNG
- balanced candidate generation
- difficulty metrics and scoring
- catalog validator/exporter
- audit catalogs and generation reports
- CLI commands

It will keep its own rules implementation for offline solving. Cross-project compatibility is controlled by `rulesVersion` and contract tests, not by importing browser-game code.

## Current migration state

The refactor branch switches new gameplay to a compact static pack generated from the already solver-verified v3 baseline and expanded prototype catalogs. It contains 40 levels per difficulty.

The old generator/solver files remain temporarily in the repository only because the connected GitHub integration cannot create the new repository. They are no longer part of the intended game runtime path and should be moved to `water-sort-level-generator` before this branch is merged as the final repository split.

Existing saved games remain self-contained because persistence stores `board` and `initialBoard`. Restart and replay therefore do not require regeneration of historical v1/v2 seeds.

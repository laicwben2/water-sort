# Repository split

Date: 2026-09-22

## Status

The Water Sort repository split is complete.

- Game client: https://github.com/laicwben2/water-sort
- Offline generator: https://github.com/laicwben2/water-sort-level-generator

The two projects communicate through the versioned Level Pack contract:

- `formatVersion: 1`
- `rulesVersion: "classic-v1"`

## Final ownership

### water-sort

Owns runtime/game concerns only:

```text
src/game/rules.ts
src/game/rules.test.ts
src/game/useGame.ts
src/game/persistence.ts
src/game/persistence.test.ts
src/game/types.ts
src/levels/catalog.ts
src/levels/catalog.test.ts
src/levels/catalog.generated.json
components / hooks / i18n / UI
spec/level-pack-v1.schema.json
docs/architecture.md
docs/level-format-v1.md
```

It does not contain a solver, generator, canonical cross-puzzle key, generator RNG, audit catalog scripts, or generator prototype data.

### water-sort-level-generator

Owns authoring/offline concerns:

```text
src/rules.ts
src/canonical.ts
src/rng.ts
src/solver.ts
src/profiles.ts
src/generator.ts
src/validator.ts
src/exporter.ts
src/cli/
tests/
spec/level-pack-v1.schema.json
data/audit/
data/output/
data/levels/          historical v3 prototype catalogs
docs/
docs/history/         migrated generator design and benchmark documents
```

The generator has its own `classic-v1` rules implementation. Compatibility with consumers is controlled by `rulesVersion` and contract tests rather than importing Web code.

## Release workflow

1. Generator creates balanced candidate boards.
2. Solver proves accepted levels.
3. Validator checks solution replay, invariants, and canonical uniqueness.
4. Difficulty metrics classify/select accepted levels.
5. Human playtesting is performed when difficulty rules change materially.
6. Exporter writes a compact Level Pack v1.
7. Consumers validate `formatVersion` and `rulesVersion`.
8. Web/iOS/Android ship only already-generated, solver-verified levels.

Official clients do not run the authoring solver on player devices.

## Completed migration work

- [x] Created `water-sort-level-generator`.
- [x] Moved the generator to a standalone Node/TypeScript project.
- [x] Added Generator unit tests and TypeScript build checks.
- [x] Added end-to-end Generator CI: generate → validate → export.
- [x] Migrated historical generator design/benchmark documents.
- [x] Migrated the two existing v3 prototype catalogs.
- [x] Changed Web Level/Random games to static Level Pack consumption.
- [x] Added Level Pack v1 parser, validation, schema, and documentation.
- [x] Preserved v1/v2 saved-game compatibility.
- [x] Keyed new static-level records by stable level ID.
- [x] Removed generator/solver/audit tooling from the Web repository.

## Remaining product work

The current Web migration pack contains 40 levels per difficulty. It is sufficient for validating the architecture, but it is not the final content strategy.

Future catalog work belongs in `water-sort-level-generator`:

- add dead-end and mistake-recovery difficulty metrics;
- calibrate difficulty using human playtests;
- generate a larger production catalog;
- decide pack sizing/versioning for Web and mobile;
- optionally publish Level Packs through GitHub Releases/CDN rather than copying them into each client repository.

These tasks do not require changing the repository boundary again.

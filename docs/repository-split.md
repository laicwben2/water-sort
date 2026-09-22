# Repository split migration

Date: 2026-09-22

## Target repositories

- `laicwben2/water-sort`: game client only.
- `laicwben2/water-sort-level-generator`: reusable offline generator.

## Files to move to the generator repository

Move, preserving history where practical:

```text
src/game/solver.ts
src/game/solver.test.ts
src/game/canonical.ts
src/game/canonical.test.ts
src/game/rng.ts
scripts/analyze-generator.mjs
scripts/generate-catalog.mjs
scripts/validate-catalog.mjs
data/levels/v3-*-prototype.json
docs/generator-baseline.md
docs/generator-v2-prototype.md
docs/level-generation-design.md
docs/offline-catalog-v3.md
```

The existing reverse generator in `src/game/generator.ts` is legacy v1/v2 technology. Copy it into the generator repository under a clearly named legacy area if historical reproducibility or comparison remains useful; it should not stay in the final game runtime.

The generator also needs a pure rules module equivalent to `classic-v1`. It should be owned by the generator project rather than importing React/game-client code.

## Files that stay in the game repository

```text
src/game/rules.ts
src/game/rules.test.ts
src/game/useGame.ts
src/game/persistence.ts
src/game/types.ts
src/levels/catalog.ts
src/levels/catalog.test.ts
src/levels/catalog.generated.json
components / hooks / i18n / UI
spec/level-pack-v1.schema.json
docs/architecture.md
docs/level-format-v1.md
```

## Generator repository shape

```text
water-sort-level-generator/
├── src/
│   ├── rules/
│   ├── generator/
│   ├── solver/
│   ├── canonical/
│   ├── evaluator/
│   ├── validator/
│   └── exporter/
├── cli/
├── spec/
│   └── level-pack-v1.schema.json
├── data/
│   ├── audit/
│   └── output/
├── docs/
└── tests/
```

Recommended CLI surface:

```bash
npm run generate -- --profile=expanded --count=1000
npm run validate -- --file=data/audit/catalog.json
npm run export:runtime -- --input=data/audit/catalog.json --output=data/output/levels-v1.json
```

## Game repository shape

```text
water-sort/
├── src/
│   ├── game/
│   ├── levels/
│   ├── components/
│   ├── hooks/
│   └── i18n/
├── spec/
├── docs/
└── public/
```

## Release workflow

1. Generator creates candidates.
2. Solver proves accepted levels.
3. Validator checks solutions, invariants, and canonical uniqueness.
4. Human difficulty sampling is performed when scoring rules change.
5. Exporter writes a compact Level Pack v1.
6. The pack is copied or published to game consumers.
7. Each consumer validates `formatVersion` and `rulesVersion`.
8. Web/iOS/Android releases play only those verified levels.

The pack is a build artifact/content artifact. The game does not invoke generator code.

## Merge gate for this migration

Before the split branch replaces production:

- create `water-sort-level-generator`;
- move the authoring code and tests;
- generate a production-sized pack, not only the current 40-per-difficulty prototype;
- run generator validation;
- run `water-sort` unit tests and production build;
- verify Level, Random, Undo, Restart, reload restoration, and completion flows;
- remove the obsolete generator/solver code and generator scripts from the game repository.


## Bootstrap branch prepared

A standalone project tree is prepared on the temporary branch:

```text
generator/bootstrap
```

That branch contains only the generator project tree: Node/TypeScript CLI, solver, generator, validator, exporter, tests, CI, documentation, and the Level Pack v1 schema. It does not contain the React/Vite game client.

Because the connected GitHub integration cannot create repositories, create an empty repository named `water-sort-level-generator` first. Then migrate the prepared tree locally.

Recommended clean-history migration:

```bash
git clone https://github.com/laicwben2/water-sort.git
cd water-sort
git switch generator/bootstrap

# Create a clean root commit containing only the prepared generator tree.
git switch --orphan generator-main
git add -A
git commit -m "Initial standalone Water Sort level generator"

git remote add generator https://github.com/laicwben2/water-sort-level-generator.git
git push -u generator generator-main:main
```

The orphan commit is intentional: `generator/bootstrap` was prepared inside the original repository and therefore has a historical parent from `water-sort`. Creating a new root commit prevents the new generator repository from inheriting unrelated Web-game history.

After the new repository exists and its CI passes, the corresponding authoring-only files can be deleted from the Web repository and the Draft split PR can be finalized.

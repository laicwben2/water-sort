# Level Pack v1

Date: 2026-09-22

Level Pack v1 is the compatibility boundary between the offline Water Sort generator and any game client.

## Example

```json
{
  "formatVersion": 1,
  "rulesVersion": "classic-v1",
  "packId": "production-2026-10",
  "generatedBy": "water-sort-level-generator",
  "levels": [
    {
      "id": "ws-hard-000123",
      "difficulty": "hard",
      "capacity": 4,
      "board": [
        [0, 2, 1, 3],
        [1, 0, 3, 2],
        [2, 3, 0, 1],
        [3, 1, 2, 0],
        [],
        []
      ],
      "metadata": {
        "optimalMoves": 27
      }
    }
  ]
}
```

## Required fields

### Pack

- `formatVersion`: JSON contract version. Current value is `1`.
- `rulesVersion`: gameplay semantic version. Current value is `classic-v1`.
- `packId`: stable identifier for the exported pack.
- `generatedBy`: producer identifier.
- `levels`: one or more level records.

### Level

- `id`: stable globally unique identifier within the producer's namespace. Reordering a pack must not change IDs.
- `difficulty`: `easy`, `medium`, or `hard`.
- `capacity`: maximum number of layers in a tube.
- `board`: bottom-to-top color IDs for each tube. An empty array is an empty tube.
- `metadata.optimalMoves`: optional solver-derived minimum move count.
- `metadata.sourceCatalog`: optional provenance label used by the current migration pack.

## Invariants

A valid runtime level must satisfy all of the following:

1. Every color ID is a non-negative integer.
2. No tube exceeds `capacity`.
3. Each color appears exactly `capacity` times.
4. Level IDs are unique inside a pack.
5. The consumer supports both the declared format and rules versions.

Classic production generation may impose stronger authoring rules, such as full non-empty tubes at the start, a bounded number of empty tubes, non-solved starting states, solver proof, canonical uniqueness, and difficulty thresholds. Those are generator acceptance criteria rather than generic JSON-shape requirements.

## Consumer behavior

Consumers should validate a pack once when it is bundled or loaded, then index levels by difficulty and ID.

Level Mode selects a deterministic entry by catalog order. Random Game selects an existing entry from the same verified pool; it does not generate a new board on-device.

A saved game should persist its full current board and initial board. This allows old games to continue even if a later release removes or reorders a level pack.

## Producer behavior

The generator may use richer internal records, but its runtime exporter must strip solver-only fields before publishing a Level Pack.

A change to field names or structure requires a new `formatVersion`. A change to legal move semantics, win conditions, or other rules interpretation requires a new `rulesVersion`.

The machine-readable schema is `spec/level-pack-v1.schema.json`.

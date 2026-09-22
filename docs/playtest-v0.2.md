# Difficulty v0.2 blind playtest mode

Date: 2026-09-22

## Purpose

This branch adds a research-only playtest path for human difficulty calibration.

It is intentionally separate from normal Level and Random modes. It must not affect:

- campaign progress;
- personal-best records;
- normal saved games;
- production Level Pack behavior.

## Entry

The playtest UI is entered through a query parameter:

```text
?playtest=1
```

Without that parameter, the normal application behaves exactly as before.

## Input

The player-facing data source is a blind playtest pack produced by
`water-sort-level-generator`.

The pack contains only:

- playtest ID;
- Type count;
- puzzle order;
- stable puzzle ID;
- capacity;
- board.

It does **not** contain:

- Easy / Medium / Hard labels;
- research metric values;
- selection rationale;
- optimal move count;
- optimal solution.

## Session behavior

The playtest displays only:

```text
Puzzle X of N
Moves
Time
```

The player may:

- Undo;
- Restart;
- change UI theme.

The player may not:

- change difficulty;
- request a random puzzle;
- see personal-best records;
- see optimal moves;
- see the research puzzle ID.

## Presentation colors

Puzzle data contains abstract Type IDs.

During playtest:

- Type -> display-color mapping is generated separately from puzzle identity;
- reload/resume keeps the current palette mapping;
- Restart generates a new palette permutation;
- changing presentation colors must not change board structure or puzzle identity.

This preserves the generator rule that Type identity and display color are separate.

## Completion and rating

After solving a puzzle, the player rates perceived difficulty from 1 to 5:

1. Very easy
2. Easy
3. Moderate
4. Hard
5. Very hard

The rating dialog may show the player's own moves and elapsed time, but never optimal values.

After a rating is submitted, the next blind puzzle loads automatically.

## Recorded data

Each completed playtest case records:

- playtest ID;
- puzzle ID;
- order;
- perceived difficulty rating;
- player move count;
- elapsed seconds;
- restart count;
- undo count.

The session also stores current in-progress state so a reload can resume without losing progress.

No research-side metrics are persisted into the player-facing result.

## Completion

After all puzzles are rated, the UI exposes an Export Results action.

The exported JSON is designed to be joined later with the Generator research
selection/report by stable puzzle ID.

## Persistence isolation

Use dedicated localStorage keys for playtest data. Do not reuse the normal
`water-sort:game:v1`, progress, or record keys.

This branch is research tooling and is not part of the production merge gate for
the normal Water Sort game.

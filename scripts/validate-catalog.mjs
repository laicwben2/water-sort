import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'

const argument = process.argv.find((value) => value.startsWith('--file='))
const catalogPath = resolve(argument?.split('=')[1] ?? 'data/levels/v3-baseline-prototype.json')
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'))
const vite = await createServer({ logLevel: 'error', server: { middlewareMode: true } })

function distribution(values) {
  const result = {}
  for (const value of values) result[value] = (result[value] ?? 0) + 1
  return result
}

function summarizeEmptyTubeTrials(puzzles) {
  const result = {}
  for (const puzzle of puzzles) {
    for (const analysis of puzzle.emptyTubeAnalysis) {
      const entry = result[analysis.emptyTubes] ?? {
        solved: 0,
        unsolvable: 0,
        budgetExceeded: 0,
        solvedMoves: [],
      }
      if (analysis.status === 'solved') {
        entry.solved += 1
        entry.solvedMoves.push(analysis.minimumMoves)
      } else if (analysis.status === 'unsolvable') {
        entry.unsolvable += 1
      } else {
        entry.budgetExceeded += 1
      }
      result[analysis.emptyTubes] = entry
    }
  }

  return Object.fromEntries(Object.entries(result).map(([emptyTubes, entry]) => [emptyTubes, {
    solved: entry.solved,
    unsolvable: entry.unsolvable,
    budgetExceeded: entry.budgetExceeded,
    ...(entry.solvedMoves.length > 0 ? {
      minimumMoves: {
        min: Math.min(...entry.solvedMoves),
        mean: Number((entry.solvedMoves.reduce((sum, value) => sum + value, 0)
          / entry.solvedMoves.length).toFixed(2)),
        max: Math.max(...entry.solvedMoves),
      },
    } : {}),
  }]))
}

try {
  const { canonicalPuzzleKey } = await vite.ssrLoadModule('/src/game/canonical.ts')
  const rules = await vite.ssrLoadModule('/src/game/rules.ts')
  const { analyzeSolutionPath } = await vite.ssrLoadModule('/src/game/solver.ts')
  const ids = new Set()
  const canonicalKeys = new Set()

  for (const puzzle of catalog.puzzles) {
    if (ids.has(puzzle.id)) throw new Error(`Duplicate puzzle id: ${puzzle.id}`)
    ids.add(puzzle.id)
    if (canonicalKeys.has(puzzle.canonicalKey)) throw new Error(`Canonical duplicate: ${puzzle.id}`)
    canonicalKeys.add(puzzle.canonicalKey)
    if (canonicalPuzzleKey(puzzle.board) !== puzzle.canonicalKey) {
      throw new Error(`Invalid canonical key: ${puzzle.id}`)
    }
    if (rules.isSolved(puzzle.board, puzzle.capacity)) throw new Error(`Starts solved: ${puzzle.id}`)
    if (puzzle.board.filter((tube) => tube.length === 0).length !== puzzle.emptyTubes) {
      throw new Error(`Empty tube mismatch: ${puzzle.id}`)
    }
    if (!puzzle.board.every((tube) => tube.length === 0 || tube.length === puzzle.capacity)) {
      throw new Error(`Non-classic occupancy: ${puzzle.id}`)
    }

    const colorCounts = new Map()
    for (const color of puzzle.board.flat()) colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1)
    if ([...colorCounts.values()].some((count) => count !== puzzle.capacity)) {
      throw new Error(`Color conservation failure: ${puzzle.id}`)
    }

    let board = puzzle.board
    for (const expectedMove of puzzle.solution) {
      const move = rules.calculatePour(board, expectedMove.from, expectedMove.to, puzzle.capacity)
      if (JSON.stringify(move) !== JSON.stringify(expectedMove)) {
        throw new Error(`Invalid saved move: ${puzzle.id}`)
      }
      board = rules.applyMove(board, move)
    }
    if (!rules.isSolved(board, puzzle.capacity)) throw new Error(`Solution does not finish: ${puzzle.id}`)
    if (puzzle.solution.length !== puzzle.solver.minimumMoves) {
      throw new Error(`Solution length mismatch: ${puzzle.id}`)
    }
    if (JSON.stringify(analyzeSolutionPath(puzzle.board, puzzle.solution, puzzle.capacity))
      !== JSON.stringify(puzzle.solutionPath)) {
      throw new Error(`Solution path metrics mismatch: ${puzzle.id}`)
    }
  }

  const byDifficulty = Object.fromEntries(['easy', 'medium', 'hard'].map((difficulty) => {
    const puzzles = catalog.puzzles.filter((puzzle) => puzzle.difficulty === difficulty)
    return [difficulty, {
      puzzles: puzzles.length,
      emptyTubes: distribution(puzzles.map((puzzle) => puzzle.emptyTubes)),
      emptyTubeTrials: summarizeEmptyTubeTrials(puzzles),
      solutionLength: distribution(puzzles.map((puzzle) => puzzle.solution.length)),
      meanExploredStates: puzzles.length === 0 ? 0 : Math.round(
        puzzles.reduce((sum, puzzle) => sum + puzzle.solver.exploredStates, 0) / puzzles.length,
      ),
      meanDecisionRatio: puzzles.length === 0 ? 0 : Number((
        puzzles.reduce((sum, puzzle) => (
          sum + puzzle.solutionPath.decisionSteps / puzzle.solution.length
        ), 0) / puzzles.length
      ).toFixed(3)),
      meanChoices: puzzles.length === 0 ? 0 : Number((
        puzzles.reduce((sum, puzzle) => sum + puzzle.solutionPath.averageChoices, 0)
          / puzzles.length
      ).toFixed(3)),
    }]
  }))

  console.log(JSON.stringify({
    valid: true,
    version: catalog.version,
    profile: catalog.profile,
    puzzles: catalog.puzzles.length,
    byDifficulty,
  }, null, 2))
} finally {
  await vite.close()
}

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { createServer } from 'vite'

const PROFILE_SETS = {
  baseline: {
    easy: { colors: 4, targetMoves: 12, minMoves: 7, maxMoves: 24, targetDecisionRatio: 0.45, maxVisitedStates: 60_000 },
    medium: { colors: 5, targetMoves: 20, minMoves: 11, maxMoves: 34, targetDecisionRatio: 0.6, maxVisitedStates: 180_000 },
    hard: { colors: 6, targetMoves: 30, minMoves: 15, maxMoves: 50, targetDecisionRatio: 0.7, maxVisitedStates: 400_000 },
  },
  expanded: {
    easy: { colors: 5, targetMoves: 17, minMoves: 11, maxMoves: 30, targetDecisionRatio: 0.5, maxVisitedStates: 250_000 },
    medium: { colors: 6, targetMoves: 23, minMoves: 15, maxMoves: 40, targetDecisionRatio: 0.65, maxVisitedStates: 600_000 },
    hard: { colors: 7, targetMoves: 30, minMoves: 19, maxMoves: 54, targetDecisionRatio: 0.75, maxVisitedStates: 1_500_000 },
  },
}
const CAPACITY = 4
const MAX_EMPTY_TUBES = 3

function parsePositiveInteger(name, fallback) {
  const argument = process.argv.find((value) => value.startsWith(`--${name}=`))
  if (!argument) return fallback
  const parsed = Number.parseInt(argument.split('=')[1], 10)
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${name} must be a positive integer`)
  return parsed
}

function parseOutput() {
  const argument = process.argv.find((value) => value.startsWith('--output='))
  return argument?.split('=')[1]
}

function parseProfile() {
  const argument = process.argv.find((value) => value.startsWith('--profile='))
  const profile = argument?.split('=')[1] ?? 'baseline'
  if (!(profile in PROFILE_SETS)) throw new Error('--profile must be baseline or expanded')
  return profile
}

function balancedBoard(colors, capacity, random, shuffle) {
  const layers = Array.from({ length: colors }, (_, color) => Array(capacity).fill(color)).flat()
  const shuffled = shuffle(layers, random)
  return Array.from({ length: colors }, (_, index) => (
    shuffled.slice(index * capacity, (index + 1) * capacity)
  ))
}

function summarizeResult(result, emptyTubes) {
  return {
    emptyTubes,
    status: result.status,
    ...(result.status === 'solved' ? { minimumMoves: result.solution.length } : {}),
    metrics: result.metrics,
  }
}

function selectDifficultyMatch(solvedResults, profile) {
  return solvedResults
    .filter(({ result }) => (
      result.solution.length >= profile.minMoves && result.solution.length <= profile.maxMoves
    ))
    .map((entry) => {
      const decisionRatio = entry.path.decisionSteps / entry.result.solution.length
      return {
        ...entry,
        score: Math.abs(entry.result.solution.length - profile.targetMoves)
          + Math.abs(decisionRatio - profile.targetDecisionRatio) * 4
          + Math.abs(entry.emptyTubes - 2) * 1.5,
      }
    })
    .sort((first, second) => first.score - second.score
      || first.emptyTubes - second.emptyTubes
      || second.result.metrics.exploredStates - first.result.metrics.exploredStates)[0]
}

const perDifficulty = parsePositiveInteger('per-difficulty', 10)
const maxAttempts = parsePositiveInteger('max-attempts', 2_000)
const profileName = parseProfile()
const profiles = PROFILE_SETS[profileName]
const outputPath = resolve(parseOutput() ?? `data/levels/v3-${profileName}-prototype.json`)
const vite = await createServer({ logLevel: 'error', server: { middlewareMode: true } })

try {
  const { canonicalPuzzleKey } = await vite.ssrLoadModule('/src/game/canonical.ts')
  const { createRng, shuffle } = await vite.ssrLoadModule('/src/game/rng.ts')
  const { analyzeSolutionPath, solveBoard } = await vite.ssrLoadModule('/src/game/solver.ts')
  const puzzles = []
  const canonicalKeys = new Set()

  for (const [difficulty, profile] of Object.entries(profiles)) {
    let accepted = 0
    for (let attempt = 0; attempt < maxAttempts && accepted < perDifficulty; attempt += 1) {
      const sourceSeed = `water-sort:catalog:v3:${profileName}:${difficulty}:candidate:${attempt}`
      const random = createRng(sourceSeed)
      const fullTubes = balancedBoard(profile.colors, CAPACITY, random, shuffle)
      const analyses = []
      const solvedResults = []

      for (let emptyTubes = 1; emptyTubes <= MAX_EMPTY_TUBES; emptyTubes += 1) {
        const board = [...fullTubes.map((tube) => [...tube]), ...Array.from({ length: emptyTubes }, () => [])]
        const result = solveBoard(board, {
          capacity: CAPACITY,
          maxDepth: profile.maxMoves + 12,
          maxVisitedStates: profile.maxVisitedStates,
        })
        analyses.push(summarizeResult(result, emptyTubes))
        if (result.status === 'solved') {
          solvedResults.push({
            board,
            emptyTubes,
            result,
            path: analyzeSolutionPath(board, result.solution, CAPACITY),
          })
        }
      }

      const selected = selectDifficultyMatch(solvedResults, profile)
      if (!selected) continue
      const canonicalKey = canonicalPuzzleKey(selected.board)
      if (canonicalKeys.has(canonicalKey)) continue
      canonicalKeys.add(canonicalKey)
      accepted += 1
      puzzles.push({
        id: `v3-${profileName}-${difficulty}-${String(accepted).padStart(4, '0')}`,
        difficulty,
        sourceSeed,
        capacity: CAPACITY,
        emptyTubes: selected.emptyTubes,
        board: selected.board,
        solution: selected.result.solution,
        canonicalKey,
        solver: {
          minimumMoves: selected.result.solution.length,
          ...selected.result.metrics,
        },
        solutionPath: selected.path,
        emptyTubeAnalysis: analyses,
      })
    }
    if (accepted < perDifficulty) {
      throw new Error(`Only generated ${accepted}/${perDifficulty} ${difficulty} puzzles after ${maxAttempts} attempts`)
    }
  }

  const catalog = {
    version: 'v3-prototype-2',
    generator: 'balanced-shuffle+bounded-a-star',
    profile: profileName,
    puzzles,
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`)
  console.log(JSON.stringify({ output: outputPath, puzzles: puzzles.length }, null, 2))
} finally {
  await vite.close()
}

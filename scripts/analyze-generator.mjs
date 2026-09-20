import { createServer } from 'vite'

const DEFAULT_LEVELS = 1_000
const difficulties = ['easy', 'medium', 'hard']

function parseLevelCount() {
  const argument = process.argv.find((value) => value.startsWith('--levels='))
  if (!argument) return DEFAULT_LEVELS
  const levels = Number.parseInt(argument.split('=')[1], 10)
  if (!Number.isInteger(levels) || levels < 1) throw new Error('--levels must be a positive integer')
  return levels
}

function parseVersion() {
  const argument = process.argv.find((value) => value.startsWith('--version='))
  const version = argument?.split('=')[1] ?? 'v2'
  if (version !== 'v1' && version !== 'v2') throw new Error('--version must be v1 or v2')
  return version
}

function distribution(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return Object.fromEntries([...counts.entries()].sort((a, b) => a[0] - b[0]))
}

function numericSummary(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))]
  return {
    min: sorted[0],
    mean: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3)),
    p50: percentile(0.5),
    p95: percentile(0.95),
    max: sorted.at(-1),
  }
}

function equalityPattern(tube) {
  const colors = new Map()
  let nextColor = 0
  return tube.map((color) => {
    if (!colors.has(color)) colors.set(color, nextColor++)
    return colors.get(color)
  }).join('.')
}

function structuralFingerprint(board) {
  const tubePatterns = board
    .map((tube) => `${tube.length}:${equalityPattern(tube)}`)
    .sort()

  const colors = [...new Set(board.flat())]
  const colorContexts = colors.map((color) => board
    .filter((tube) => tube.includes(color))
    .map((tube) => {
      const positions = tube.flatMap((entry, index) => entry === color ? [index] : [])
      return `${tube.length}:${equalityPattern(tube)}:${positions.join('.')}`
    })
    .sort()
    .join(','))
    .sort()

  return `${tubePatterns.join('|')}#${colorContexts.join('|')}`
}

function areBoardsIsomorphic(first, second) {
  if (first.length !== second.length) return false

  const order = first
    .map((tube, index) => ({ index, key: `${tube.length}:${equalityPattern(tube)}` }))
    .sort((a, b) => b.key.localeCompare(a.key))
  const secondKeys = second.map((tube) => `${tube.length}:${equalityPattern(tube)}`)
  const used = new Set()
  const forwardColors = new Map()
  const reverseColors = new Map()

  function match(depth) {
    if (depth === order.length) return true
    const { index: firstIndex, key } = order[depth]
    const firstTube = first[firstIndex]

    for (let secondIndex = 0; secondIndex < second.length; secondIndex += 1) {
      if (used.has(secondIndex) || secondKeys[secondIndex] !== key) continue
      const secondTube = second[secondIndex]
      const additions = []
      let compatible = true

      for (let layer = 0; layer < firstTube.length; layer += 1) {
        const firstColor = firstTube[layer]
        const secondColor = secondTube[layer]
        const mappedForward = forwardColors.get(firstColor)
        const mappedReverse = reverseColors.get(secondColor)
        if ((mappedForward !== undefined && mappedForward !== secondColor)
          || (mappedReverse !== undefined && mappedReverse !== firstColor)) {
          compatible = false
          break
        }
        if (mappedForward === undefined) {
          forwardColors.set(firstColor, secondColor)
          reverseColors.set(secondColor, firstColor)
          additions.push([firstColor, secondColor])
        }
      }

      if (compatible) {
        used.add(secondIndex)
        if (match(depth + 1)) return true
        used.delete(secondIndex)
      }

      for (const [firstColor, secondColor] of additions) {
        forwardColors.delete(firstColor)
        reverseColors.delete(secondColor)
      }
    }
    return false
  }

  return match(0)
}

function verifyIsomorphismCheck() {
  const first = [[0, 1, 0], [1], []]
  const renamedAndReordered = [[], [7], [9, 7, 9]]
  const differentStructure = [[], [7], [9, 9, 7]]
  if (!areBoardsIsomorphic(first, renamedAndReordered)
    || areBoardsIsomorphic(first, differentStructure)) {
    throw new Error('Board isomorphism self-check failed')
  }
}

function countCanonicalDuplicates(boards) {
  const buckets = new Map()
  let duplicates = 0

  for (const board of boards) {
    const fingerprint = structuralFingerprint(board)
    const representatives = buckets.get(fingerprint) ?? []
    if (representatives.some((candidate) => areBoardsIsomorphic(candidate, board))) {
      duplicates += 1
    } else {
      representatives.push(board)
      buckets.set(fingerprint, representatives)
    }
  }

  return duplicates
}

function assertPuzzle(puzzle, expectedColors, rules) {
  if (rules.isSolved(puzzle.board, puzzle.capacity)) throw new Error(`${puzzle.seed} starts solved`)
  if (puzzle.board.some((tube) => tube.length > puzzle.capacity)) throw new Error(`${puzzle.seed} exceeds capacity`)

  const colorCounts = new Map()
  for (const color of puzzle.board.flat()) colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1)
  if (colorCounts.size !== expectedColors
    || [...colorCounts.values()].some((count) => count !== puzzle.capacity)) {
    throw new Error(`${puzzle.seed} does not conserve colors`)
  }

  let board = puzzle.board
  for (const expectedMove of puzzle.solution) {
    const move = rules.calculatePour(board, expectedMove.from, expectedMove.to, puzzle.capacity)
    if (JSON.stringify(move) !== JSON.stringify(expectedMove)) {
      throw new Error(`${puzzle.seed} contains an invalid saved solution move`)
    }
    board = rules.applyMove(board, move)
  }
  if (!rules.isSolved(board, puzzle.capacity)) throw new Error(`${puzzle.seed} solution does not finish`)
}

function analyzeDifficulty(difficulty, levels, version, generator, rules) {
  const config = generator.DIFFICULTY_CONFIG[difficulty]
  const boards = []
  const emptyCounts = []
  const partialCounts = []
  const complexities = []
  const solutionLengths = []
  const generationTimes = []
  const exactKeys = new Set()
  const tubeOrderKeys = new Set()
  let exactDuplicates = 0
  let tubeOrderDuplicates = 0
  let classicBoards = 0

  for (let level = 1; level <= levels; level += 1) {
    const seed = version === 'v1'
      ? generator.levelSeedV1(difficulty, level)
      : generator.levelSeed(difficulty, level)
    const startedAt = performance.now()
    const puzzle = generator.generatePuzzle(difficulty, seed)
    generationTimes.push(performance.now() - startedAt)
    const replay = generator.generatePuzzle(difficulty, seed)

    if (JSON.stringify(puzzle) !== JSON.stringify(replay)) throw new Error(`${seed} is not deterministic`)
    assertPuzzle(puzzle, config.colors, rules)

    const emptyCount = puzzle.board.filter((tube) => tube.length === 0).length
    const partialCount = puzzle.board.filter((tube) => tube.length > 0 && tube.length < puzzle.capacity).length
    const exactKey = rules.boardKey(puzzle.board)
    const tubeOrderKey = puzzle.board.map((tube) => tube.join('.')).sort().join('|')

    if (exactKeys.has(exactKey)) exactDuplicates += 1
    if (tubeOrderKeys.has(tubeOrderKey)) tubeOrderDuplicates += 1
    exactKeys.add(exactKey)
    tubeOrderKeys.add(tubeOrderKey)

    if (emptyCount === config.emptyTubes
      && puzzle.board.every((tube) => tube.length === 0 || tube.length === puzzle.capacity)) {
      classicBoards += 1
    }

    boards.push(puzzle.board)
    emptyCounts.push(emptyCount)
    partialCounts.push(partialCount)
    complexities.push(puzzle.complexity)
    solutionLengths.push(puzzle.solution.length)
  }

  const canonicalDuplicates = countCanonicalDuplicates(boards)
  return {
    levels,
    config,
    invariantFailures: 0,
    occupancy: {
      emptyTubes: distribution(emptyCounts),
      partialTubes: distribution(partialCounts),
      classicBoards,
      classicRate: Number((classicBoards / levels).toFixed(4)),
    },
    complexity: numericSummary(complexities),
    knownSolutionLength: numericSummary(solutionLengths),
    generationMs: numericSummary(generationTimes),
    duplicates: {
      exact: exactDuplicates,
      ignoringTubeOrder: tubeOrderDuplicates,
      ignoringTubeAndColorIdentity: canonicalDuplicates,
    },
  }
}

const levels = parseLevelCount()
const version = parseVersion()
verifyIsomorphismCheck()
const vite = await createServer({ logLevel: 'error', server: { middlewareMode: true } })

try {
  const generator = await vite.ssrLoadModule('/src/game/generator.ts')
  const rules = await vite.ssrLoadModule('/src/game/rules.ts')
  const results = Object.fromEntries(difficulties.map((difficulty) => [
    difficulty,
    analyzeDifficulty(difficulty, levels, version, generator, rules),
  ]))
  console.log(JSON.stringify({ generatorVersion: version, results }, null, 2))
} finally {
  await vite.close()
}

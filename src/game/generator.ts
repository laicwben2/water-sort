import { applyMove, boardKey, isSolved, isUniform, topColor, topRunLength } from './rules'
import { createRng, pick, shuffle } from './rng'
import type { Board, Difficulty, Move, Puzzle } from './types'

export const DIFFICULTY_CONFIG = {
  // In v1 this controls spare capacity in the solved starting state. Reverse
  // moves may distribute those slots, so a generated board is not guaranteed
  // to visibly contain this many completely empty tubes.
  easy: { colors: 4, emptyTubes: 2, scramble: 18, minComplexity: 10 },
  medium: { colors: 6, emptyTubes: 2, scramble: 30, minComplexity: 18 },
  hard: { colors: 8, emptyTubes: 2, scramble: 46, minComplexity: 27 },
} as const

interface ReverseMove extends Move {
  inverse: Move
}

function solvedBoard(colors: number, emptyTubes: number, capacity: number): Board {
  return [
    ...Array.from({ length: colors }, (_, color) => Array(capacity).fill(color)),
    ...Array.from({ length: emptyTubes }, () => [] as number[]),
  ]
}

function reverseCandidates(board: Board, capacity: number): ReverseMove[] {
  const candidates: ReverseMove[] = []
  for (let from = 0; from < board.length; from += 1) {
    const source = board[from]
    if (source.length === 0) continue
    const color = topColor(source)!
    const maxAmount = topRunLength(source)
    for (let to = 0; to < board.length; to += 1) {
      const target = board[to]
      if (from === to || target.length >= capacity || topColor(target) === color) continue
      const limit = Math.min(maxAmount, capacity - target.length)
      for (let amount = 1; amount <= limit; amount += 1) {
        // The inverse must be a legal forward pour: after removal the source
        // must still show the same color, or be empty.
        if (amount === maxAmount && amount !== source.length) continue
        if (amount === source.length && target.length === 0) continue
        candidates.push({
          from,
          to,
          color,
          amount,
          inverse: { from: to, to: from, color, amount },
        })
      }
    }
  }
  return candidates
}

function applyReverse(board: Board, move: ReverseMove): Board {
  return applyMove(board, move)
}

export function puzzleComplexity(board: Board): number {
  let transitions = 0
  let mixedTubes = 0
  let partialTubes = 0
  for (const tube of board) {
    if (tube.length > 0 && tube.length < 4) partialTubes += 1
    if (tube.length > 1 && !isUniform(tube)) mixedTubes += 1
    for (let index = 1; index < tube.length; index += 1) {
      if (tube[index] !== tube[index - 1]) transitions += 1
    }
  }
  return transitions * 2 + mixedTubes * 2 + partialTubes
}

function generateAttempt(difficulty: Difficulty, seed: string, capacity: number, scrambleDepth?: number): Puzzle | null {
  const config = DIFFICULTY_CONFIG[difficulty]
  const random = createRng(seed)
  let board = solvedBoard(config.colors, config.emptyTubes, capacity)
  const forwardSolution: Move[] = []
  const seen = new Set([boardKey(board)])

  for (let step = 0; step < (scrambleDepth ?? config.scramble); step += 1) {
    const candidates = shuffle(reverseCandidates(board, capacity), random)
    const viable = candidates.filter((candidate) => !seen.has(boardKey(applyReverse(board, candidate))))
    if (viable.length === 0) break

    // Bias toward states that add boundaries, while preserving deterministic variety.
    const sample = viable.slice(0, Math.min(8, viable.length))
    const weighted = sample
      .map((candidate, index) => ({
        candidate,
        index,
        score: puzzleComplexity(applyReverse(board, candidate)) + random() * 2,
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .map(({ candidate }) => candidate)
    const chosen = pick(weighted.slice(0, Math.min(3, weighted.length)), random)
    board = applyReverse(board, chosen)
    seen.add(boardKey(board))
    forwardSolution.unshift(chosen.inverse)
  }

  const complexity = puzzleComplexity(board)
  if (isSolved(board, capacity) || complexity < config.minComplexity || forwardSolution.length < config.colors * 2) return null
  return { board, capacity, difficulty, seed, solution: forwardSolution, complexity }
}

export function isClassicBoard(board: Board, emptyTubes: number, capacity = 4): boolean {
  return board.filter((tube) => tube.length === 0).length === emptyTubes
    && board.every((tube) => tube.length === 0 || tube.length === capacity)
}

export function levelSeedV1(difficulty: Difficulty, level: number): string {
  return `water-sort:v1:${difficulty}:level:${Math.max(1, Math.floor(level))}`
}

export function levelSeed(difficulty: Difficulty, level: number): string {
  return `water-sort:v2:${difficulty}:level:${Math.max(1, Math.floor(level))}`
}

export function randomSeed(): string {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(3)
    globalThis.crypto.getRandomValues(values)
    return `water-sort:v2:random:${Array.from(values).join('-')}`
  }
  return `water-sort:v2:random:${Date.now()}-${Math.random()}`
}

function generateLegacyPuzzle(difficulty: Difficulty, seed: string, capacity: number): Puzzle {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const puzzle = generateAttempt(difficulty, `${seed}:attempt:${attempt}`, capacity)
    if (puzzle) return { ...puzzle, seed }
  }
  throw new Error(`Unable to generate ${difficulty} puzzle`)
}

function applyPresentationPermutation(puzzle: Puzzle, seed: string): Puzzle {
  const random = createRng(`${seed}:presentation`)
  const colors = shuffle(
    Array.from({ length: DIFFICULTY_CONFIG[puzzle.difficulty].colors }, (_, color) => color),
    random,
  )
  const tubeOrder = shuffle(puzzle.board.map((_, index) => index), random)
  const newTubeIndex = new Map(tubeOrder.map((oldIndex, newIndex) => [oldIndex, newIndex]))

  return {
    ...puzzle,
    board: tubeOrder.map((oldIndex) => puzzle.board[oldIndex].map((color) => colors[color])),
    solution: puzzle.solution.map((move) => ({
      ...move,
      from: newTubeIndex.get(move.from)!,
      to: newTubeIndex.get(move.to)!,
      color: colors[move.color],
    })),
  }
}

function generateClassicPuzzle(difficulty: Difficulty, seed: string, capacity: number): Puzzle {
  const config = DIFFICULTY_CONFIG[difficulty]
  const targetCandidates = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 2 : 1
  const candidates: Puzzle[] = []
  const candidateKeys = new Set<string>()

  for (let attempt = 0; attempt < 960; attempt += 1) {
    const deepSearch = attempt < 640
    const puzzle = generateAttempt(
      difficulty,
      `${seed}:classic:${deepSearch ? 'deep' : 'fallback'}:${attempt}`,
      capacity,
      deepSearch ? config.scramble * 2 : config.scramble,
    )
    if (puzzle && isClassicBoard(puzzle.board, config.emptyTubes, capacity)) {
      const key = boardKey(puzzle.board)
      if (!candidateKeys.has(key)) {
        candidates.push(puzzle)
        candidateKeys.add(key)
      }
      if (candidates.length === targetCandidates) {
        return applyPresentationPermutation(
          { ...pick(candidates, createRng(`${seed}:classic:pick`)), seed },
          seed,
        )
      }
    }
  }
  if (candidates.length > 0) {
    return applyPresentationPermutation(
      { ...pick(candidates, createRng(`${seed}:classic:pick`)), seed },
      seed,
    )
  }
  throw new Error(`Unable to generate classic ${difficulty} puzzle for ${seed}`)
}

export function generatePuzzle(difficulty: Difficulty, seed: string, capacity = 4): Puzzle {
  return seed.startsWith('water-sort:v1:')
    ? generateLegacyPuzzle(difficulty, seed, capacity)
    : generateClassicPuzzle(difficulty, seed, capacity)
}

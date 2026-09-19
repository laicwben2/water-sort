import { applyMove, boardKey, isSolved, isUniform, topColor, topRunLength } from './rules'
import { createRng, pick, shuffle } from './rng'
import type { Board, Difficulty, Move, Puzzle } from './types'

export const DIFFICULTY_CONFIG = {
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

function generateAttempt(difficulty: Difficulty, seed: string, capacity: number): Puzzle | null {
  const config = DIFFICULTY_CONFIG[difficulty]
  const random = createRng(seed)
  let board = solvedBoard(config.colors, config.emptyTubes, capacity)
  const forwardSolution: Move[] = []
  const seen = new Set([boardKey(board)])

  for (let step = 0; step < config.scramble; step += 1) {
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

export function levelSeed(difficulty: Difficulty, level: number): string {
  return `water-sort:v1:${difficulty}:level:${Math.max(1, Math.floor(level))}`
}

export function randomSeed(): string {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(3)
    globalThis.crypto.getRandomValues(values)
    return `water-sort:v1:random:${Array.from(values).join('-')}`
  }
  return `water-sort:v1:random:${Date.now()}-${Math.random()}`
}

export function generatePuzzle(difficulty: Difficulty, seed: string, capacity = 4): Puzzle {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const puzzle = generateAttempt(difficulty, `${seed}:attempt:${attempt}`, capacity)
    if (puzzle) return { ...puzzle, seed }
  }
  throw new Error(`Unable to generate ${difficulty} puzzle`)
}

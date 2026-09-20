import { describe, expect, it } from 'vitest'
import { DIFFICULTY_CONFIG, generatePuzzle, isClassicBoard, levelSeed, levelSeedV1 } from './generator'
import { applyMove, calculatePour, isSolved } from './rules'
import type { Difficulty } from './types'

const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

describe('puzzle generator', () => {
  it('is deterministic for a difficulty and level seed', () => {
    const seed = levelSeed('medium', 17)
    expect(generatePuzzle('medium', seed).board).toEqual(generatePuzzle('medium', seed).board)
  })

  it('keeps v1 seeds reproducible through the legacy path', () => {
    const seed = levelSeedV1('easy', 12)
    expect(generatePuzzle('easy', seed).board).toEqual([
      [0],
      [1, 1, 1, 2],
      [2, 1, 0, 3],
      [3, 3, 0],
      [],
      [2, 2, 3, 0],
    ])
  })

  it.each(difficulties)('creates a valid, unsolved, solvable %s puzzle', (difficulty) => {
    const puzzle = generatePuzzle(difficulty, levelSeed(difficulty, 9))
    expect(isSolved(puzzle.board)).toBe(false)
    expect(puzzle.board.every((tube) => tube.length <= puzzle.capacity)).toBe(true)

    const counts = new Map<number, number>()
    puzzle.board.flat().forEach((color) => counts.set(color, (counts.get(color) ?? 0) + 1))
    expect([...counts.values()].every((count) => count === puzzle.capacity)).toBe(true)

    let board = puzzle.board
    for (const expectedMove of puzzle.solution) {
      const legalMove = calculatePour(board, expectedMove.from, expectedMove.to, puzzle.capacity)
      expect(legalMove).toEqual(expectedMove)
      board = applyMove(board, legalMove!)
    }
    expect(isSolved(board, puzzle.capacity)).toBe(true)
  })

  it('varies across level numbers', () => {
    const first = generatePuzzle('easy', levelSeed('easy', 1)).board
    const second = generatePuzzle('easy', levelSeed('easy', 2)).board
    expect(second).not.toEqual(first)
  })

  it.each(difficulties)('preserves invariants across a batch of %s levels', (difficulty) => {
    for (let level = 1; level <= 25; level += 1) {
      const puzzle = generatePuzzle(difficulty, levelSeed(difficulty, level))
      expect(isSolved(puzzle.board, puzzle.capacity)).toBe(false)
      expect(isClassicBoard(
        puzzle.board,
        DIFFICULTY_CONFIG[difficulty].emptyTubes,
        puzzle.capacity,
      )).toBe(true)
      expect(puzzle.board.flat()).toHaveLength(
        new Set(puzzle.board.flat()).size * puzzle.capacity,
      )

      let board = puzzle.board
      for (const expectedMove of puzzle.solution) {
        const legalMove = calculatePour(board, expectedMove.from, expectedMove.to, puzzle.capacity)
        expect(legalMove).toEqual(expectedMove)
        board = applyMove(board, legalMove!)
      }
      expect(isSolved(board, puzzle.capacity)).toBe(true)
    }
  })
})

describe('Classic v2 occupancy contract', () => {
  it.each(difficulties)('starts %s with exactly the configured number of empty tubes', (difficulty) => {
    const puzzle = generatePuzzle(difficulty, levelSeed(difficulty, 31))
    expect(puzzle.board.filter((tube) => tube.length === 0)).toHaveLength(
      DIFFICULTY_CONFIG[difficulty].emptyTubes,
    )
  })

  it.each(difficulties)('starts %s with every non-empty tube filled to capacity', (difficulty) => {
    const puzzle = generatePuzzle(difficulty, levelSeed(difficulty, 31))
    expect(puzzle.board.every(
      (tube) => tube.length === 0 || tube.length === puzzle.capacity,
    )).toBe(true)
  })
})

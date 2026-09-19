import { describe, expect, it } from 'vitest'
import { generatePuzzle, levelSeed } from './generator'
import { applyMove, calculatePour, isSolved } from './rules'
import type { Difficulty } from './types'

const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

describe('puzzle generator', () => {
  it('is deterministic for a difficulty and level seed', () => {
    const seed = levelSeed('medium', 17)
    expect(generatePuzzle('medium', seed).board).toEqual(generatePuzzle('medium', seed).board)
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
})

import { describe, expect, it } from 'vitest'
import { applyMove, calculatePour, isSolved, tryPour, undoMove } from './rules'
import type { Board } from './types'

describe('water sort rules', () => {
  it('pours into an empty tube', () => {
    const board: Board = [[0, 1], []]
    expect(tryPour(board, 0, 1)?.board).toEqual([[0], [1]])
  })

  it('pours onto the same color', () => {
    const board: Board = [[0, 1], [2, 1]]
    expect(tryPour(board, 0, 1)?.board).toEqual([[0], [2, 1, 1]])
  })

  it('rejects a different top color', () => {
    expect(calculatePour([[0], [1]], 0, 1)).toBeNull()
  })

  it('rejects a full target', () => {
    expect(calculatePour([[0], [1, 1, 1, 1]], 0, 1)).toBeNull()
  })

  it('rejects an empty source', () => {
    expect(calculatePour([[], [1]], 0, 1)).toBeNull()
  })

  it('pours the complete contiguous top run', () => {
    const result = tryPour([[0, 1, 1, 1], []], 0, 1)
    expect(result?.move.amount).toBe(3)
    expect(result?.board).toEqual([[0], [1, 1, 1]])
  })

  it('limits a pour to remaining capacity', () => {
    const result = tryPour([[0, 1, 1, 1], [2, 2, 1]], 0, 1)
    expect(result?.move.amount).toBe(1)
    expect(result?.board).toEqual([[0, 1, 1], [2, 2, 1, 1]])
  })

  it('undoes a completed move exactly', () => {
    const board: Board = [[0, 1, 1], [2, 1]]
    const move = calculatePour(board, 0, 1)!
    expect(undoMove(applyMove(board, move), move)).toEqual(board)
  })

  it('detects only fully completed boards as solved', () => {
    expect(isSolved([[0, 0, 0, 0], [], [1, 1, 1, 1]])).toBe(true)
    expect(isSolved([[0, 0], [], [1, 1, 1, 1]])).toBe(false)
    expect(isSolved([[0, 0, 1, 1], []])).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { applyMove, isSolved } from './rules'
import { analyzeSolutionPath, listLegalMoves, solveBoard } from './solver'
import type { Board } from './types'

describe('bounded water sort solver', () => {
  it('returns an empty solution for an already solved board', () => {
    const result = solveBoard([[0, 0], [1, 1], [], []], { capacity: 2 })
    expect(result.status).toBe('solved')
    if (result.status === 'solved') expect(result.solution).toEqual([])
  })

  it('finds and replays a shortest solution', () => {
    const board: Board = [[0, 1], [0, 1], [], []]
    const result = solveBoard(board, { capacity: 2 })
    expect(result.status).toBe('solved')
    if (result.status !== 'solved') return
    expect(result.solution).toHaveLength(3)
    expect(isSolved(result.solution.reduce(applyMove, board), 2)).toBe(true)
  })

  it('does not modify the input board', () => {
    const board: Board = [[0, 1], [1, 0], [], []]
    const snapshot = board.map((tube) => [...tube])
    solveBoard(board, { capacity: 2 })
    expect(board).toEqual(snapshot)
  })

  it('proves a closed mixed board is unsolvable', () => {
    expect(solveBoard([[0, 1], [1, 0]], { capacity: 2 }).status).toBe('unsolvable')
  })

  it('reports budget-exceeded instead of claiming unsolvable', () => {
    expect(solveBoard([[0, 1], [1, 0], [], []], {
      capacity: 2,
      maxVisitedStates: 0,
    }).status).toBe('budget-exceeded')
  })

  it('collapses moves that only differ by symmetric tube choices', () => {
    expect(listLegalMoves([[0, 1], [0, 1], [], []], 2)).toHaveLength(1)
  })

  it('measures decisions along a solved path', () => {
    const board: Board = [[0, 1], [0, 1], [], []]
    const result = solveBoard(board, { capacity: 2 })
    expect(result.status).toBe('solved')
    if (result.status !== 'solved') return
    expect(analyzeSolutionPath(board, result.solution, 2)).toEqual({
      decisionSteps: 1,
      forcedSteps: 2,
      totalAlternativeMoves: 1,
      averageChoices: 4 / 3,
      maximumChoices: 2,
    })
  })
})

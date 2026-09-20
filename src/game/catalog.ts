import type { Board, Difficulty, Move } from './types'
import type { SolverMetrics } from './solver'

export interface EmptyTubeAnalysis {
  emptyTubes: number
  status: 'solved' | 'unsolvable' | 'budget-exceeded'
  minimumMoves?: number
  metrics: SolverMetrics
}

export interface CatalogPuzzle {
  id: string
  difficulty: Difficulty
  sourceSeed: string
  capacity: number
  emptyTubes: number
  board: Board
  solution: Move[]
  canonicalKey: string
  solver: SolverMetrics & { minimumMoves: number }
  emptyTubeAnalysis: EmptyTubeAnalysis[]
}

export interface PuzzleCatalog {
  version: string
  generator: 'balanced-shuffle+bounded-a-star'
  puzzles: CatalogPuzzle[]
}

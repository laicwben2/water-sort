export type ColorId = number
export type Tube = ColorId[]
export type Board = Tube[]
export type Difficulty = 'easy' | 'medium' | 'hard'
export type GameMode = 'level' | 'random'

export interface Move {
  from: number
  to: number
  color: ColorId
  amount: number
}

export interface Snapshot {
  board: Board
  moveCount: number
}

export interface Puzzle {
  board: Board
  capacity: number
  difficulty: Difficulty
  seed: string
  solution: Move[]
  complexity: number
}

export interface GameRecord {
  bestMoves?: number
  bestTime?: number
}

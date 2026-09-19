import type { Board, Difficulty, GameMode, GameRecord, Snapshot } from './types'

const STORAGE_KEY = 'water-sort:game:v1'
const RECORDS_KEY = 'water-sort:records:v1'
const PROGRESS_KEY = 'water-sort:progress:v1'

export interface SavedGame {
  version: 1
  difficulty: Difficulty
  mode: GameMode
  level: number
  unlockedLevel: number
  seed: string
  board: Board
  initialBoard: Board
  history: Snapshot[]
  moveCount: number
  elapsedSeconds: number
  timerStarted: boolean
  savedAt: number
  completed: boolean
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

export function loadGame(): SavedGame | null {
  const game = readJson<SavedGame | null>(STORAGE_KEY, null)
  return game?.version === 1 ? game : null
}

export function saveGame(game: SavedGame): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(game))
}

export function loadProgress(difficulty: Difficulty): number {
  return readJson<Record<Difficulty, number>>(PROGRESS_KEY, { easy: 1, medium: 1, hard: 1 })[difficulty] ?? 1
}

export function saveProgress(difficulty: Difficulty, level: number): void {
  const progress = readJson<Record<Difficulty, number>>(PROGRESS_KEY, { easy: 1, medium: 1, hard: 1 })
  progress[difficulty] = Math.max(progress[difficulty] ?? 1, level)
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function recordKey(difficulty: Difficulty, mode: GameMode, level: number, seed: string): string {
  return mode === 'level' ? `${difficulty}:level:${level}` : `${difficulty}:random:${seed}`
}

export function loadRecord(key: string): GameRecord {
  return readJson<Record<string, GameRecord>>(RECORDS_KEY, {})[key] ?? {}
}

export function saveRecord(key: string, moves: number, time: number): GameRecord {
  const records = readJson<Record<string, GameRecord>>(RECORDS_KEY, {})
  const previous = records[key] ?? {}
  const next = {
    bestMoves: Math.min(previous.bestMoves ?? Infinity, moves),
    bestTime: Math.min(previous.bestTime ?? Infinity, time),
  }
  records[key] = next
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records))
  return next
}

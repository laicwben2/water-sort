import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { getLevelByNumber, getRandomLevel, levelCount } from '../levels/catalog'
import { calculatePour, cloneBoard, isSolved, applyMove } from './rules'
import { loadGame, loadProgress, loadRecord, recordKey, saveGame, saveProgress, saveRecord, type SavedGame } from './persistence'
import type { Board, Difficulty, GameMode, GameRecord, Move, Snapshot } from './types'

export interface GameState {
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
  completed: boolean
  record: GameRecord
}

type Action =
  | { type: 'MOVE'; move: Move }
  | { type: 'UNDO' }
  | { type: 'TICK' }
  | { type: 'RESTART' }
  | { type: 'LOAD'; state: GameState }

function makeGame(difficulty: Difficulty, mode: GameMode, level: number): GameState {
  const availableLevels = levelCount(difficulty)
  if (availableLevels < 1) throw new Error(`No ${difficulty} levels are available`)
  const resolvedLevel = mode === 'level'
    ? Math.min(Math.max(1, Math.floor(level)), availableLevels)
    : 0
  const puzzle = mode === 'level'
    ? getLevelByNumber(difficulty, resolvedLevel)
    : getRandomLevel(difficulty)
  const actualSeed = puzzle.id
  const key = recordKey(difficulty, mode, resolvedLevel, actualSeed)
  return {
    difficulty,
    mode,
    level: resolvedLevel,
    unlockedLevel: loadProgress(difficulty),
    seed: actualSeed,
    board: cloneBoard(puzzle.board),
    initialBoard: cloneBoard(puzzle.board),
    history: [],
    moveCount: 0,
    elapsedSeconds: 0,
    timerStarted: false,
    completed: false,
    record: loadRecord(key),
  }
}

function restoreGame(saved: SavedGame): GameState {
  const elapsedSinceSave = saved.timerStarted && !saved.completed
    ? Math.max(0, Math.floor((Date.now() - saved.savedAt) / 1000))
    : 0
  return {
    ...saved,
    board: cloneBoard(saved.board),
    initialBoard: cloneBoard(saved.initialBoard),
    history: saved.history.map((snapshot) => ({ ...snapshot, board: cloneBoard(snapshot.board) })),
    elapsedSeconds: saved.elapsedSeconds + elapsedSinceSave,
    record: loadRecord(recordKey(saved.difficulty, saved.mode, saved.level, saved.seed)),
  }
}

function initialState(): GameState {
  const saved = loadGame()
  return saved && !saved.completed ? restoreGame(saved) : makeGame('easy', 'level', 1)
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'MOVE': {
      const board = applyMove(state.board, action.move)
      const completed = isSolved(board)
      const next = {
        ...state,
        board,
        history: [...state.history, { board: cloneBoard(state.board), moveCount: state.moveCount }],
        moveCount: state.moveCount + 1,
        timerStarted: true,
        completed,
      }
      if (!completed) return next
      const key = recordKey(state.difficulty, state.mode, state.level, state.seed)
      const record = saveRecord(key, next.moveCount, next.elapsedSeconds)
      if (state.mode === 'level') saveProgress(state.difficulty, state.level + 1)
      return { ...next, unlockedLevel: Math.max(state.unlockedLevel, state.level + 1), record }
    }
    case 'UNDO': {
      const snapshot = state.history.at(-1)
      if (!snapshot || state.completed) return state
      return { ...state, board: cloneBoard(snapshot.board), moveCount: snapshot.moveCount, history: state.history.slice(0, -1) }
    }
    case 'TICK':
      return state.timerStarted && !state.completed ? { ...state, elapsedSeconds: state.elapsedSeconds + 1 } : state
    case 'RESTART':
      return { ...state, board: cloneBoard(state.initialBoard), history: [], moveCount: 0, elapsedSeconds: 0, timerStarted: false, completed: false }
    case 'LOAD':
      return action.state
  }
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    const timer = window.setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    saveGame({
      version: 1,
      difficulty: state.difficulty,
      mode: state.mode,
      level: state.level,
      unlockedLevel: state.unlockedLevel,
      seed: state.seed,
      board: state.board,
      initialBoard: state.initialBoard,
      history: state.history,
      moveCount: state.moveCount,
      elapsedSeconds: state.elapsedSeconds,
      timerStarted: state.timerStarted,
      savedAt: Date.now(),
      completed: state.completed,
    })
  }, [state])

  const pour = useCallback((from: number, to: number) => {
    const move = calculatePour(state.board, from, to)
    if (!move || state.completed) return null
    dispatch({ type: 'MOVE', move })
    return move
  }, [state.board, state.completed])

  const load = useCallback((difficulty: Difficulty, mode: GameMode, level: number) => {
    dispatch({ type: 'LOAD', state: makeGame(difficulty, mode, level) })
  }, [])

  return useMemo(() => ({
    state,
    pour,
    undo: () => dispatch({ type: 'UNDO' }),
    restart: () => dispatch({ type: 'RESTART' }),
    changeDifficulty: (difficulty: Difficulty) => load(difficulty, 'level', loadProgress(difficulty)),
    newRandomGame: () => load(state.difficulty, 'random', 0),
    nextLevel: () => load(state.difficulty, 'level', Math.min(state.level + 1, levelCount(state.difficulty))),
    replay: () => dispatch({ type: 'RESTART' }),
  }), [load, pour, state])
}

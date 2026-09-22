import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { getPlaytestLevel, playtestCount, playtestPack } from '../levels/playtest'
import { applyMove, calculatePour, cloneBoard, isSolved } from './rules'
import type { Board, Move, Snapshot } from './types'

export type PlaytestRating = 1 | 2 | 3 | 4 | 5

export interface PlaytestResult {
  id: string
  order: number
  rating: PlaytestRating
  moves: number
  elapsedSeconds: number
  restarts: number
  undos: number
  ratedAt: string
}

export interface PlaytestState {
  version: 1
  playtestId: string
  order: number
  total: number
  levelId: string
  capacity: number
  board: Board
  initialBoard: Board
  history: Snapshot[]
  moveCount: number
  elapsedSeconds: number
  timerStarted: boolean
  completed: boolean
  finished: boolean
  restarts: number
  undos: number
  palette: number[]
  results: PlaytestResult[]
  startedAt: string
  savedAt: number
}

type Action =
  | { type: 'MOVE'; move: Move }
  | { type: 'UNDO' }
  | { type: 'TICK' }
  | { type: 'RESTART'; palette: number[] }
  | { type: 'RATE'; rating: PlaytestRating; ratedAt: string; nextPalette: number[] }
  | { type: 'RESET'; state: PlaytestState }

const STORAGE_KEY = `water-sort:playtest:${playtestPack.playtestId}:v1`

function randomUint32(): number {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1)
    globalThis.crypto.getRandomValues(values)
    return values[0]
  }
  return Math.floor(Math.random() * 0x1_0000_0000)
}

export function createPlaytestPalette(types = playtestPack.types): number[] {
  const palette = Array.from({ length: types }, (_, index) => index)
  for (let index = palette.length - 1; index > 0; index -= 1) {
    const other = randomUint32() % (index + 1)
    ;[palette[index], palette[other]] = [palette[other], palette[index]]
  }
  return palette
}

function makePuzzleState(
  order: number,
  results: PlaytestResult[] = [],
  startedAt = new Date().toISOString(),
  palette = createPlaytestPalette(),
): PlaytestState {
  const level = getPlaytestLevel(order)
  return {
    version: 1,
    playtestId: playtestPack.playtestId,
    order,
    total: playtestCount(),
    levelId: level.id,
    capacity: level.capacity,
    board: cloneBoard(level.board),
    initialBoard: cloneBoard(level.board),
    history: [],
    moveCount: 0,
    elapsedSeconds: 0,
    timerStarted: false,
    completed: false,
    finished: false,
    restarts: 0,
    undos: 0,
    palette,
    results,
    startedAt,
    savedAt: Date.now(),
  }
}

function isPlaytestResult(value: unknown): value is PlaytestResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as Partial<PlaytestResult>
  return typeof result.id === 'string'
    && Number.isInteger(result.order)
    && Number.isInteger(result.rating)
    && (result.rating ?? 0) >= 1
    && (result.rating ?? 0) <= 5
    && Number.isInteger(result.moves)
    && Number.isInteger(result.elapsedSeconds)
    && Number.isInteger(result.restarts)
    && Number.isInteger(result.undos)
    && typeof result.ratedAt === 'string'
}

function loadSession(): PlaytestState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Partial<PlaytestState>
    if (saved.version !== 1 || saved.playtestId !== playtestPack.playtestId) return null
    if (!Number.isInteger(saved.order) || (saved.order ?? 0) < 1 || (saved.order ?? 0) > playtestCount()) return null
    if (!Array.isArray(saved.board) || !Array.isArray(saved.initialBoard) || !Array.isArray(saved.history)) return null
    if (!Array.isArray(saved.palette) || saved.palette.length !== playtestPack.types) return null
    if (!Array.isArray(saved.results) || !saved.results.every(isPlaytestResult)) return null
    if (typeof saved.levelId !== 'string' || typeof saved.startedAt !== 'string') return null

    const elapsedSinceSave = saved.timerStarted && !saved.completed && !saved.finished
      ? Math.max(0, Math.floor((Date.now() - (saved.savedAt ?? Date.now())) / 1000))
      : 0

    return {
      ...saved,
      version: 1,
      playtestId: playtestPack.playtestId,
      order: saved.order,
      total: playtestCount(),
      levelId: saved.levelId,
      capacity: saved.capacity ?? 4,
      board: cloneBoard(saved.board),
      initialBoard: cloneBoard(saved.initialBoard),
      history: saved.history.map((snapshot) => ({ ...snapshot, board: cloneBoard(snapshot.board) })),
      moveCount: saved.moveCount ?? 0,
      elapsedSeconds: (saved.elapsedSeconds ?? 0) + elapsedSinceSave,
      timerStarted: saved.timerStarted ?? false,
      completed: saved.completed ?? false,
      finished: saved.finished ?? false,
      restarts: saved.restarts ?? 0,
      undos: saved.undos ?? 0,
      palette: [...saved.palette],
      results: [...saved.results],
      startedAt: saved.startedAt,
      savedAt: Date.now(),
    }
  } catch {
    return null
  }
}

function initialState(): PlaytestState {
  return loadSession() ?? makePuzzleState(1)
}

function reducer(state: PlaytestState, action: Action): PlaytestState {
  switch (action.type) {
    case 'MOVE': {
      if (state.completed || state.finished) return state
      const board = applyMove(state.board, action.move)
      return {
        ...state,
        board,
        history: [...state.history, { board: cloneBoard(state.board), moveCount: state.moveCount }],
        moveCount: state.moveCount + 1,
        timerStarted: true,
        completed: isSolved(board, state.capacity),
      }
    }
    case 'UNDO': {
      const snapshot = state.history.at(-1)
      if (!snapshot || state.completed || state.finished) return state
      return {
        ...state,
        board: cloneBoard(snapshot.board),
        moveCount: snapshot.moveCount,
        history: state.history.slice(0, -1),
        undos: state.undos + 1,
      }
    }
    case 'TICK':
      return state.timerStarted && !state.completed && !state.finished
        ? { ...state, elapsedSeconds: state.elapsedSeconds + 1 }
        : state
    case 'RESTART':
      if (state.finished) return state
      return {
        ...state,
        board: cloneBoard(state.initialBoard),
        history: [],
        moveCount: 0,
        elapsedSeconds: 0,
        timerStarted: false,
        completed: false,
        restarts: state.restarts + 1,
        palette: action.palette,
      }
    case 'RATE': {
      if (!state.completed || state.finished) return state
      const result: PlaytestResult = {
        id: state.levelId,
        order: state.order,
        rating: action.rating,
        moves: state.moveCount,
        elapsedSeconds: state.elapsedSeconds,
        restarts: state.restarts,
        undos: state.undos,
        ratedAt: action.ratedAt,
      }
      const results = [...state.results, result]

      if (state.order >= state.total) {
        return {
          ...state,
          completed: false,
          finished: true,
          timerStarted: false,
          results,
        }
      }

      return makePuzzleState(state.order + 1, results, state.startedAt, action.nextPalette)
    }
    case 'RESET':
      return action.state
  }
}

export function usePlaytestGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => {
    const timer = window.setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }))
    } catch {
      // Playtest remains usable even if persistence is unavailable.
    }
  }, [state])

  const pour = useCallback((from: number, to: number) => {
    if (state.completed || state.finished) return null
    const move = calculatePour(state.board, from, to, state.capacity)
    if (!move) return null
    dispatch({ type: 'MOVE', move })
    return move
  }, [state.board, state.capacity, state.completed, state.finished])

  const resetSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore storage failures.
    }
    dispatch({ type: 'RESET', state: makePuzzleState(1) })
  }, [])

  const exportResults = useCallback(() => {
    const payload = {
      version: 1,
      playtestId: playtestPack.playtestId,
      types: playtestPack.types,
      startedAt: state.startedAt,
      exportedAt: new Date().toISOString(),
      results: state.results,
    }
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${playtestPack.playtestId}-results.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [state.results, state.startedAt])

  return useMemo(() => ({
    state,
    pour,
    undo: () => dispatch({ type: 'UNDO' }),
    restart: () => dispatch({ type: 'RESTART', palette: createPlaytestPalette() }),
    rate: (rating: PlaytestRating) => dispatch({
      type: 'RATE',
      rating,
      ratedAt: new Date().toISOString(),
      nextPalette: createPlaytestPalette(),
    }),
    resetSession,
    exportResults,
  }), [exportResults, pour, resetSession, state])
}

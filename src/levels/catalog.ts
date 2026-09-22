import rawCatalog from './catalog.generated.json'
import type { Board, Difficulty } from '../game/types'

export interface RuntimeLevelMetadata {
  optimalMoves?: number
  sourceCatalog?: string
}

export interface RuntimeLevel {
  id: string
  difficulty: Difficulty
  capacity: number
  board: Board
  metadata?: RuntimeLevelMetadata
}

export interface LevelPack {
  formatVersion: 1
  rulesVersion: 'classic-v1'
  packId: string
  generatedBy: string
  levels: RuntimeLevel[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard'
}

function parseLevel(value: unknown, index: number): RuntimeLevel {
  if (!isRecord(value)) throw new Error(`Level ${index} must be an object`)
  const { id, difficulty, capacity, board, metadata } = value

  if (typeof id !== 'string' || id.length === 0) throw new Error(`Level ${index} has an invalid id`)
  if (!isDifficulty(difficulty)) throw new Error(`Level ${id} has an invalid difficulty`)
  if (!Number.isInteger(capacity) || (capacity as number) < 1) throw new Error(`Level ${id} has an invalid capacity`)
  if (!Array.isArray(board) || board.length < 2) throw new Error(`Level ${id} has an invalid board`)

  const parsedBoard: Board = board.map((tube, tubeIndex) => {
    if (!Array.isArray(tube) || tube.length > (capacity as number)) {
      throw new Error(`Level ${id} has an invalid tube at index ${tubeIndex}`)
    }
    return tube.map((color) => {
      if (!Number.isInteger(color) || (color as number) < 0) {
        throw new Error(`Level ${id} has an invalid color id`)
      }
      return color as number
    })
  })

  const colorCounts = new Map<number, number>()
  for (const color of parsedBoard.flat()) colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1)
  for (const count of colorCounts.values()) {
    if (count !== capacity) throw new Error(`Level ${id} does not conserve color volume`)
  }

  let parsedMetadata: RuntimeLevelMetadata | undefined
  if (metadata !== undefined) {
    if (!isRecord(metadata)) throw new Error(`Level ${id} has invalid metadata`)
    const { optimalMoves, sourceCatalog } = metadata
    if (optimalMoves !== undefined && (!Number.isInteger(optimalMoves) || (optimalMoves as number) < 0)) {
      throw new Error(`Level ${id} has invalid optimalMoves`)
    }
    if (sourceCatalog !== undefined && typeof sourceCatalog !== 'string') {
      throw new Error(`Level ${id} has invalid sourceCatalog`)
    }
    parsedMetadata = {
      ...(optimalMoves === undefined ? {} : { optimalMoves: optimalMoves as number }),
      ...(sourceCatalog === undefined ? {} : { sourceCatalog }),
    }
  }

  return {
    id,
    difficulty,
    capacity: capacity as number,
    board: parsedBoard,
    ...(parsedMetadata ? { metadata: parsedMetadata } : {}),
  }
}

export function parseLevelPack(value: unknown): LevelPack {
  if (!isRecord(value)) throw new Error('Level pack must be an object')
  if (value.formatVersion !== 1) throw new Error('Unsupported level pack formatVersion')
  if (value.rulesVersion !== 'classic-v1') throw new Error('Unsupported rulesVersion')
  if (typeof value.packId !== 'string' || value.packId.length === 0) throw new Error('Level pack has an invalid packId')
  if (typeof value.generatedBy !== 'string' || value.generatedBy.length === 0) {
    throw new Error('Level pack has an invalid generatedBy value')
  }
  if (!Array.isArray(value.levels) || value.levels.length === 0) throw new Error('Level pack contains no levels')

  const levels = value.levels.map(parseLevel)
  const ids = new Set<string>()
  for (const level of levels) {
    if (ids.has(level.id)) throw new Error(`Duplicate level id: ${level.id}`)
    ids.add(level.id)
  }

  return {
    formatVersion: 1,
    rulesVersion: 'classic-v1',
    packId: value.packId,
    generatedBy: value.generatedBy,
    levels,
  }
}

export const levelPack = parseLevelPack(rawCatalog)

const levelsByDifficulty = new Map<Difficulty, RuntimeLevel[]>([
  ['easy', levelPack.levels.filter((level) => level.difficulty === 'easy')],
  ['medium', levelPack.levels.filter((level) => level.difficulty === 'medium')],
  ['hard', levelPack.levels.filter((level) => level.difficulty === 'hard')],
])

export function levelCount(difficulty: Difficulty): number {
  return levelsByDifficulty.get(difficulty)?.length ?? 0
}

export function getLevelByNumber(difficulty: Difficulty, levelNumber: number): RuntimeLevel {
  const levels = levelsByDifficulty.get(difficulty) ?? []
  const index = Math.floor(levelNumber) - 1
  const level = levels[index]
  if (!level) throw new RangeError(`No ${difficulty} level ${levelNumber} in pack ${levelPack.packId}`)
  return level
}

export function getRandomLevel(difficulty: Difficulty): RuntimeLevel {
  const levels = levelsByDifficulty.get(difficulty) ?? []
  if (levels.length === 0) throw new RangeError(`No ${difficulty} levels in pack ${levelPack.packId}`)

  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1)
    globalThis.crypto.getRandomValues(value)
    return levels[value[0] % levels.length]
  }
  return levels[Math.floor(Math.random() * levels.length)]
}

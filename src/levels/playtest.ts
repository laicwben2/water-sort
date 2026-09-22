import rawPlaytest from './playtest.generated.json'
import type { Board } from '../game/types'

export interface BlindPlaytestLevel {
  order: number
  id: string
  capacity: number
  board: Board
}

export interface BlindPlaytestPack {
  formatVersion: 1
  rulesVersion: 'classic-v1'
  kind: 'blind-playtest'
  playtestId: string
  types: number
  levels: BlindPlaytestLevel[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseLevel(value: unknown, expectedTypes: number): BlindPlaytestLevel {
  if (!isRecord(value)) throw new Error('Playtest level must be an object')
  const { order, id, capacity, board } = value

  if (!Number.isInteger(order) || (order as number) < 1) throw new Error('Invalid playtest order')
  if (typeof id !== 'string' || id.length === 0) throw new Error('Invalid playtest level id')
  if (!Number.isInteger(capacity) || (capacity as number) < 1) throw new Error(`Invalid capacity for ${id}`)
  if (!Array.isArray(board) || board.length < 2) throw new Error(`Invalid board for ${id}`)

  const parsedBoard: Board = board.map((tube, tubeIndex) => {
    if (!Array.isArray(tube) || tube.length > (capacity as number)) {
      throw new Error(`Invalid tube ${tubeIndex} for ${id}`)
    }
    return tube.map((type) => {
      if (!Number.isInteger(type) || (type as number) < 0 || (type as number) >= expectedTypes) {
        throw new Error(`Invalid Type id in ${id}`)
      }
      return type as number
    })
  })

  const counts = new Map<number, number>()
  for (const type of parsedBoard.flat()) counts.set(type, (counts.get(type) ?? 0) + 1)
  if (counts.size !== expectedTypes) throw new Error(`Type count mismatch in ${id}`)
  for (let type = 0; type < expectedTypes; type += 1) {
    if (counts.get(type) !== capacity) throw new Error(`Type volume mismatch in ${id}`)
  }

  return {
    order: order as number,
    id,
    capacity: capacity as number,
    board: parsedBoard,
  }
}

export function parseBlindPlaytestPack(value: unknown): BlindPlaytestPack {
  if (!isRecord(value)) throw new Error('Playtest pack must be an object')
  if (value.formatVersion !== 1) throw new Error('Unsupported playtest formatVersion')
  if (value.rulesVersion !== 'classic-v1') throw new Error('Unsupported playtest rulesVersion')
  if (value.kind !== 'blind-playtest') throw new Error('Unsupported playtest kind')
  if (typeof value.playtestId !== 'string' || value.playtestId.length === 0) {
    throw new Error('Invalid playtestId')
  }
  if (!Number.isInteger(value.types) || (value.types as number) < 1 || (value.types as number) > 16) {
    throw new Error('Invalid playtest Type count')
  }
  if (!Array.isArray(value.levels) || value.levels.length === 0) {
    throw new Error('Playtest pack contains no levels')
  }

  const levels = value.levels.map((level) => parseLevel(level, value.types as number))
    .sort((first, second) => first.order - second.order)

  const ids = new Set<string>()
  levels.forEach((level, index) => {
    if (level.order !== index + 1) throw new Error('Playtest order must be contiguous from 1')
    if (ids.has(level.id)) throw new Error(`Duplicate playtest level id: ${level.id}`)
    ids.add(level.id)
  })

  return {
    formatVersion: 1,
    rulesVersion: 'classic-v1',
    kind: 'blind-playtest',
    playtestId: value.playtestId,
    types: value.types as number,
    levels,
  }
}

export const playtestPack = parseBlindPlaytestPack(rawPlaytest)

export function playtestCount(): number {
  return playtestPack.levels.length
}

export function getPlaytestLevel(order: number): BlindPlaytestLevel {
  const level = playtestPack.levels[Math.floor(order) - 1]
  if (!level) throw new RangeError(`No playtest puzzle ${order}`)
  return level
}

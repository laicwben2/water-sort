import { describe, expect, it } from 'vitest'
import { parseBlindPlaytestPack, playtestPack } from './playtest'

describe('blind playtest pack', () => {
  it('loads the generated blind pack', () => {
    expect(playtestPack.playtestId).toBe('types7-v0.2')
    expect(playtestPack.types).toBe(7)
    expect(playtestPack.levels).toHaveLength(12)
    expect(playtestPack.levels.map((level) => level.order))
      .toEqual(Array.from({ length: 12 }, (_, index) => index + 1))
  })

  it('rejects invalid type volume', () => {
    expect(() => parseBlindPlaytestPack({
      formatVersion: 1,
      rulesVersion: 'classic-v1',
      kind: 'blind-playtest',
      playtestId: 'bad',
      types: 2,
      levels: [{
        order: 1,
        id: 'bad-1',
        capacity: 2,
        board: [[0, 1], [0, 1], []],
      }],
    })).toThrow('Type volume mismatch')
  })

  it('rejects non-contiguous ordering', () => {
    expect(() => parseBlindPlaytestPack({
      formatVersion: 1,
      rulesVersion: 'classic-v1',
      kind: 'blind-playtest',
      playtestId: 'bad-order',
      types: 1,
      levels: [{
        order: 2,
        id: 'bad-2',
        capacity: 2,
        board: [[0, 0], []],
      }],
    })).toThrow('contiguous')
  })
})

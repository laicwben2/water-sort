import { describe, expect, it } from 'vitest'
import { getLevelByNumber, getRandomLevel, levelCount, levelPack, parseLevelPack } from './catalog'

describe('runtime level pack', () => {
  it('contains a balanced prototype set for every difficulty', () => {
    expect(levelPack.formatVersion).toBe(1)
    expect(levelPack.rulesVersion).toBe('classic-v1')
    expect(levelCount('easy')).toBe(40)
    expect(levelCount('medium')).toBe(40)
    expect(levelCount('hard')).toBe(40)
  })

  it('keeps level ids unique', () => {
    const ids = levelPack.levels.map((level) => level.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('retrieves deterministic level-mode entries by position', () => {
    expect(getLevelByNumber('easy', 1).difficulty).toBe('easy')
    expect(getLevelByNumber('hard', levelCount('hard')).difficulty).toBe('hard')
  })

  it('returns a random entry only from the requested difficulty', () => {
    expect(getRandomLevel('medium').difficulty).toBe('medium')
  })

  it('rejects incompatible packs', () => {
    expect(() => parseLevelPack({
      formatVersion: 2,
      rulesVersion: 'classic-v1',
      packId: 'bad',
      generatedBy: 'test',
      levels: [],
    })).toThrow(/formatVersion/)
  })
})

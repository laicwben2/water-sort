import { describe, expect, it } from 'vitest'
import { recordKey } from './persistence'

describe('record identity', () => {
  it('keeps legacy generated level records on numeric keys', () => {
    expect(recordKey('easy', 'level', 12, 'water-sort:v2:easy:level:12')).toBe('easy:level:12')
  })

  it('keys static catalog level records by stable level id', () => {
    expect(recordKey('hard', 'level', 12, 'ws-expanded-hard-c000123'))
      .toBe('hard:level-id:ws-expanded-hard-c000123')
  })

  it('keys random records by content id', () => {
    expect(recordKey('medium', 'random', 0, 'ws-expanded-medium-c000456'))
      .toBe('medium:random:ws-expanded-medium-c000456')
  })
})

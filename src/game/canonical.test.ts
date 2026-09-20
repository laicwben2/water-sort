import { describe, expect, it } from 'vitest'
import { canonicalPuzzleKey, canonicalStateKey } from './canonical'

describe('canonical board representation', () => {
  it('ignores tube order for solver states', () => {
    expect(canonicalStateKey([[0, 1], [], [1, 0]])).toBe(
      canonicalStateKey([[], [1, 0], [0, 1]]),
    )
  })

  it('preserves color identity in the solver hot path', () => {
    expect(canonicalStateKey([[0, 1], [1, 1], []])).not.toBe(
      canonicalStateKey([[0, 2], [2, 2], []]),
    )
  })

  it('ignores both tube order and color names across puzzles', () => {
    const first = [[0, 1, 0, 2], [2, 1, 2, 0], [1, 0, 1, 2], []]
    const renamedAndReordered = [[], [8, 4, 8, 7], [7, 4, 7, 8], [4, 8, 4, 7]]
    expect(canonicalPuzzleKey(first)).toBe(canonicalPuzzleKey(renamedAndReordered))
  })

  it('keeps genuinely different puzzle structures distinct', () => {
    expect(canonicalPuzzleKey([[0, 1, 0], [1], []])).not.toBe(
      canonicalPuzzleKey([[0, 0, 1], [1], []]),
    )
  })
})

import type { Board } from './types'

function encodeTube(tube: readonly number[], colorMap?: ReadonlyMap<number, number>): string {
  return tube.map((color) => colorMap?.get(color) ?? color).join(',')
}

function encodeSortedTubes(board: Board, colorMap?: ReadonlyMap<number, number>): string {
  return board.map((tube) => encodeTube(tube, colorMap)).sort().join('|')
}

/**
 * Canonical search-state key. Tube positions are interchangeable, while color
 * IDs stay fixed for the lifetime of one puzzle. This is cheap enough for the
 * solver's visited-state set.
 */
export function canonicalStateKey(board: Board): string {
  return encodeSortedTubes(board)
}

function visitPermutations<T>(values: T[], visit: (permutation: T[]) => void): void {
  function permute(start: number) {
    if (start === values.length) {
      visit(values)
      return
    }
    for (let index = start; index < values.length; index += 1) {
      ;[values[start], values[index]] = [values[index], values[start]]
      permute(start + 1)
      ;[values[start], values[index]] = [values[index], values[start]]
    }
  }
  permute(0)
}

/**
 * Exact cross-puzzle key that ignores both tube order and color names.
 * It enumerates color renamings, so it belongs in the offline catalog pipeline
 * rather than the browser solver hot path.
 */
export function canonicalPuzzleKey(board: Board): string {
  const colors = [...new Set(board.flat())].sort((a, b) => a - b)
  let best: string | undefined

  visitPermutations(colors, (permutation) => {
    const colorMap = new Map(permutation.map((color, canonicalColor) => [color, canonicalColor]))
    const candidate = encodeSortedTubes(board, colorMap)
    if (best === undefined || candidate < best) best = candidate
  })

  return best ?? encodeSortedTubes(board)
}

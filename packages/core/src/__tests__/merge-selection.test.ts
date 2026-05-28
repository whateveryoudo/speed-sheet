import { describe, it, expect } from 'vitest'
import {
  buildMergeLookup,
  selectionDisplayBounds,
  selectionRangeForMergeHit,
} from '../merge'

describe('merge selection bounds', () => {
  const merges = [{ r: 6, c: 1, rs: 2, cs: 2 }]
  const lookup = buildMergeLookup(merges)

  it('selectionDisplayBounds expands 1x1 anchor on merge to full merge', () => {
    const bounds = selectionDisplayBounds(
      {
        row: [7, 7],
        column: [1, 1],
        anchor: { r: 6, c: 1 },
      },
      lookup,
    )
    expect(bounds).toEqual({ r0: 6, r1: 7, c0: 1, c1: 2 })
  })

  it('selectionRangeForMergeHit selects full merge when clicking slave', () => {
    const range = selectionRangeForMergeHit(7, 2, lookup)
    expect(range.row).toEqual([6, 7])
    expect(range.column).toEqual([1, 2])
    expect(range.anchor).toEqual({ r: 6, c: 1 })
  })
})

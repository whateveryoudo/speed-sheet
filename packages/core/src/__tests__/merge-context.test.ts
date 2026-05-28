import { describe, it, expect } from 'vitest'
import { MergeContext } from '../merge/MergeContext'

describe('MergeContext', () => {
  const mc = MergeContext.fromRanges([{ r: 2, c: 1, rs: 2, cs: 3 }])

  it('anchor resolves slave to anchor cell', () => {
    expect(mc.anchor(3, 2)).toEqual({ r: 2, c: 1 })
  })

  it('hasPartialMergeInRect detects partial overlap', () => {
    expect(mc.hasPartialMergeInRect(2, 1, 3, 3)).toBe(false)
    expect(mc.hasPartialMergeInRect(3, 3, 4, 4)).toBe(true)
    expect(mc.hasPartialMergeInRect(2, 1, 3, 2)).toBe(true)
  })
})

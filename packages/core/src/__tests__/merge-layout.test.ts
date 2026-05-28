import { describe, it, expect } from 'vitest'
import {
  buildMergeLookup,
  mergePixelRect,
  isMergeInternalColLineAtRow,
  isMergeInternalRowLineAtCol,
} from '../merge'
import { defaultLayout } from '../renderer/canvas-renderer'
import { buildGridMetrics } from '../renderer/grid-metrics'

describe('merge-layout', () => {
  it('buildMergeLookup marks anchor and slaves', () => {
    const lookup = buildMergeLookup([{ r: 1, c: 2, rs: 2, cs: 3 }])
    expect(lookup.at(1, 2)).toEqual({ r: 1, c: 2, rs: 2, cs: 3 })
    expect(lookup.isSlave(1, 2)).toBe(false)
    expect(lookup.isSlave(1, 3)).toBe(true)
    expect(lookup.isSlave(2, 4)).toBe(true)
    expect(lookup.at(2, 4)).toEqual({ r: 1, c: 2, rs: 2, cs: 3 })
    expect(lookup.at(0, 0)).toBeUndefined()
  })

  it('merge internal grid only inside merge bounds', () => {
    const merges = [{ r: 5, c: 3, rs: 2, cs: 2 }]
    // D:E x 6:7 内部竖线
    expect(isMergeInternalColLineAtRow(4, 5, merges)).toBe(true)
    expect(isMergeInternalColLineAtRow(4, 6, merges)).toBe(true)
    // 同行但不在合并行 → 不隐藏
    expect(isMergeInternalColLineAtRow(4, 0, merges)).toBe(false)
    expect(isMergeInternalColLineAtRow(4, 4, merges)).toBe(false)
    // 同列但不在合并列 → 不隐藏
    expect(isMergeInternalRowLineAtCol(6, 0, merges)).toBe(false)
    expect(isMergeInternalRowLineAtCol(6, 2, merges)).toBe(false)
    expect(isMergeInternalRowLineAtCol(6, 3, merges)).toBe(true)
  })

  it('mergePixelRect spans multiple rows and cols', () => {
    const layout = {
      ...defaultLayout(),
      totalRows: 10,
      totalCols: 10,
      defaultRowHeight: 20,
      defaultColWidth: 80,
    }
    const M = buildGridMetrics(layout)
    const layoutWithM = { ...layout, metrics: M }
    const rect = mergePixelRect({ r: 0, c: 0, rs: 2, cs: 2 }, layoutWithM, M)
    expect(rect.w).toBe(160)
    expect(rect.h).toBe(40)
  })
})

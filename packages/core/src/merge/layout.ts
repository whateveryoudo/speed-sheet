import type { MergeRange, Selection } from '@speed-sheet/shared'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import { gridCellX, gridCellY } from '../renderer/layout-metrics'

export type MergeLookup = {
  at(r: number, c: number): MergeRange | undefined
  isSlave(r: number, c: number): boolean
}

export function buildMergeLookup(merges: MergeRange[]): MergeLookup {
  const byAnchor = new Map<string, MergeRange>()
  const slave = new Set<string>()

  for (const m of merges) {
    byAnchor.set(`${m.r}_${m.c}`, m)
    for (let dr = 0; dr < m.rs; dr++) {
      for (let dc = 0; dc < m.cs; dc++) {
        if (dr === 0 && dc === 0) continue
        slave.add(`${m.r + dr}_${m.c + dc}`)
      }
    }
  }

  return {
    at(r, c) {
      const key = `${r}_${c}`
      if (byAnchor.has(key)) return byAnchor.get(key)
      if (slave.has(key)) {
        for (const m of merges) {
          if (
            r >= m.r &&
            r < m.r + m.rs &&
            c >= m.c &&
            c < m.c + m.cs
          ) {
            return m
          }
        }
      }
      return undefined
    },
    isSlave(r, c) {
      return slave.has(`${r}_${c}`)
    },
  }
}

export function isMergeInternalColLineAtRow(
  lineCol: number,
  row: number,
  merges: MergeRange[],
): boolean {
  for (const m of merges) {
    if (m.cs <= 1) continue
    if (row < m.r || row >= m.r + m.rs) continue
    if (lineCol > m.c && lineCol < m.c + m.cs) return true
  }
  return false
}

export function isMergeInternalRowLineAtCol(
  lineRow: number,
  col: number,
  merges: MergeRange[],
): boolean {
  for (const m of merges) {
    if (m.rs <= 1) continue
    if (col < m.c || col >= m.c + m.cs) continue
    if (lineRow > m.r && lineRow < m.r + m.rs) return true
  }
  return false
}

export function selectionDisplayBounds(
  selection: Selection,
  lookup: MergeLookup,
): { r0: number; r1: number; c0: number; c1: number } {
  let r0 = Math.min(selection.row[0], selection.row[1])
  let r1 = Math.max(selection.row[0], selection.row[1])
  let c0 = Math.min(selection.column[0], selection.column[1])
  let c1 = Math.max(selection.column[0], selection.column[1])
  const ar = selection.anchor?.r ?? r0
  const ac = selection.anchor?.c ?? c0
  const m = lookup.at(ar, ac)
  if (m) {
    r0 = Math.min(r0, m.r)
    r1 = Math.max(r1, m.r + m.rs - 1)
    c0 = Math.min(c0, m.c)
    c1 = Math.max(c1, m.c + m.cs - 1)
  }
  return { r0, r1, c0, c1 }
}

export function selectionRangeForMergeHit(
  r: number,
  c: number,
  lookup: MergeLookup,
): {
  row: [number, number]
  column: [number, number]
  anchor: { r: number; c: number }
} {
  const m = lookup.at(r, c)
  if (m) {
    return {
      row: [m.r, m.r + m.rs - 1],
      column: [m.c, m.c + m.cs - 1],
      anchor: { r: m.r, c: m.c },
    }
  }
  return {
    row: [r, r],
    column: [c, c],
    anchor: { r, c },
  }
}

export function findMergeMatchingSelection(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  merges: MergeRange[],
): MergeRange | undefined {
  return merges.find(
    (m) =>
      r0 === m.r &&
      c0 === m.c &&
      r1 === m.r + m.rs - 1 &&
      c1 === m.c + m.cs - 1,
  )
}

export function mergePixelRect(
  m: MergeRange,
  layout: GridLayout,
  M: GridMetrics,
): { x: number; y: number; w: number; h: number } {
  const r1 = m.r + m.rs - 1
  const c1 = m.c + m.cs - 1
  return {
    x: gridCellX(layout, M, m.c),
    y: gridCellY(layout, M, m.r),
    w: M.colRight(c1) - M.colLeft(m.c),
    h: M.rowBottom(r1) - M.rowTop(m.r),
  }
}

export function focusPixelRect(
  r: number,
  c: number,
  layout: GridLayout,
  M: GridMetrics,
  lookup: MergeLookup,
): { x: number; y: number; w: number; h: number } {
  const m = lookup.at(r, c)
  if (m) return mergePixelRect(m, layout, M)
  return {
    x: gridCellX(layout, M, c),
    y: gridCellY(layout, M, r),
    w: M.colWidth(c),
    h: M.rowHeight(r),
  }
}

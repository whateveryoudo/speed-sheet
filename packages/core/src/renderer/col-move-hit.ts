import type { GridLayout } from './grid-layout'
import type { GridMetrics } from './grid-metrics'
import { hitColResizeHandle } from './resize-hit'

const RESIZE_HIT_PX = 5

/** Col index under pointer in the column header (excludes resize edges). */
export function hitColHeader(
  canvasX: number,
  canvasY: number,
  layout: GridLayout,
  metrics: GridMetrics,
): number | null {
  const { rowHeaderWidth: RHW, columnHeaderHeight: CHH, scrollX: sx } = layout
  if (canvasY < 0 || canvasY > CHH || canvasX < RHW) return null
  if (hitColResizeHandle(canvasX, canvasY, layout, metrics, RESIZE_HIT_PX) != null) {
    return null
  }

  const contentX = canvasX - RHW + sx
  for (let c = 0; c < metrics.totalCols; c++) {
    if (contentX >= metrics.colLeft(c) && contentX < metrics.colRight(c)) return c
  }
  return null
}

export function colMoveInsertIndex(
  contentX: number,
  metrics: GridMetrics,
  dragFrom: number,
  dragCount: number,
): number {
  const n = metrics.totalCols
  if (n <= 0) return 0

  for (let c = 0; c < n; c++) {
    const mid = (metrics.colLeft(c) + metrics.colRight(c)) / 2
    if (contentX < mid) {
      return clampInsertIndex(c, dragFrom, dragCount, n)
    }
  }
  return clampInsertIndex(n, dragFrom, dragCount, n)
}

function clampInsertIndex(
  raw: number,
  from: number,
  count: number,
  n: number,
): number {
  let to = Math.max(0, Math.min(n, raw))
  if (to > from && to < from + count) {
    to = from + count
  }
  return to
}

export function mapColIndexAfterMove(
  c: number,
  from: number,
  count: number,
  insertAt: number,
): number {
  if (c >= from && c < from + count) {
    return insertAt + (c - from)
  }
  let nc = c
  if (c < from) {
    if (c >= insertAt) nc += count
  } else {
    nc -= count
    if (insertAt > from && nc >= insertAt) nc += count
  }
  return nc
}

export function colMoveGuideCanvasX(
  insertBefore: number,
  layout: GridLayout,
  metrics: GridMetrics,
): number {
  const { rowHeaderWidth: RHW, scrollX: sx } = layout
  if (insertBefore >= metrics.totalCols) {
    return RHW + metrics.totalWidth - sx
  }
  return RHW + metrics.colLeft(insertBefore) - sx
}

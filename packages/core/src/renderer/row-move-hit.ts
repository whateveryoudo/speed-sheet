import type { GridLayout } from './grid-layout'
import type { GridMetrics } from './grid-metrics'
import { hitRowResizeHandle } from './resize-hit'

const RESIZE_HIT_PX = 5

/** Row index under pointer in the row-number header (excludes resize edges). */
export function hitRowHeader(
  canvasX: number,
  canvasY: number,
  layout: GridLayout,
  metrics: GridMetrics,
): number | null {
  const { rowHeaderWidth: RHW, columnHeaderHeight: CHH, scrollY: sy } = layout
  if (canvasX < 0 || canvasX > RHW || canvasY < CHH) return null
  if (hitRowResizeHandle(canvasX, canvasY, layout, metrics, RESIZE_HIT_PX) != null) {
    return null
  }

  const contentY = canvasY - CHH + sy
  for (let r = 0; r < metrics.totalRows; r++) {
    if (contentY >= metrics.rowTop(r) && contentY < metrics.rowBottom(r)) return r
  }
  return null
}

/**
 * Insert dragged rows before this display index (0..totalRows).
 * `contentY` is in sheet content coordinates (scroll included).
 */
export function rowMoveInsertIndex(
  contentY: number,
  metrics: GridMetrics,
  dragFrom: number,
  dragCount: number,
): number {
  const n = metrics.totalRows
  if (n <= 0) return 0

  for (let r = 0; r < n; r++) {
    const mid = (metrics.rowTop(r) + metrics.rowBottom(r)) / 2
    if (contentY < mid) {
      return clampInsertIndex(r, dragFrom, dragCount, n)
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

/** Map display row index after moving [from, from+count) to insertAt. */
export function mapRowIndexAfterMove(
  r: number,
  from: number,
  count: number,
  insertAt: number,
): number {
  if (r >= from && r < from + count) {
    return insertAt + (r - from)
  }
  let nr = r
  if (r < from) {
    if (r >= insertAt) nr += count
  } else {
    nr -= count
    if (insertAt > from && nr >= insertAt) nr += count
  }
  return nr
}

/** Canvas Y of the drop indicator line (top edge of `insertBefore` row). */
export function rowMoveGuideCanvasY(
  insertBefore: number,
  layout: GridLayout,
  metrics: GridMetrics,
): number {
  const { columnHeaderHeight: CHH, scrollY: sy } = layout
  if (insertBefore >= metrics.totalRows) {
    return CHH + metrics.totalHeight - sy
  }
  return CHH + metrics.rowTop(insertBefore) - sy
}

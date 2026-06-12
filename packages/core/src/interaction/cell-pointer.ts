import type { MergeRange } from '@speed-sheet/shared'
import { MergeContext } from '../merge'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import { canvasPointToCell } from '../renderer/layout-metrics'
import { pointerFromMouseEvent, type CanvasPointer } from './pointer'

export type CellPoint = { r: number; c: number }

function toMergeContext(merge?: MergeContext | MergeRange[]): MergeContext {
  if (merge instanceof MergeContext) return merge
  return MergeContext.fromRanges(merge ?? [])
}

export function clampCellCoords(
  r: number,
  c: number,
  totalRows: number,
  totalCols: number,
): CellPoint {
  return {
    r: Math.max(0, Math.min(totalRows - 1, r)),
    c: Math.max(0, Math.min(totalCols - 1, c)),
  }
}

/** Cell under pointer in the grid body (excludes row/column headers). */
export function cellPointFromCanvasPointer(
  pointer: CanvasPointer,
  layout: GridLayout,
  metrics: GridMetrics,
  merge?: MergeContext | MergeRange[],
): CellPoint | null {
  const { rowHeaderWidth: rhw, columnHeaderHeight: chh } = layout
  if (pointer.canvasX < rhw || pointer.canvasY < chh) return null
  const { r, c } = canvasPointToCell(layout, metrics, pointer.canvasX, pointer.canvasY)
  if (r < 0 || c < 0) return null
  const pt = clampCellCoords(r, c, metrics.totalRows, metrics.totalCols)
  return toMergeContext(merge).anchor(pt.r, pt.c)
}

export function cellPointFromMouse(
  e: MouseEvent,
  canvasRect: DOMRect,
  layout: GridLayout,
  metrics: GridMetrics,
  merge?: MergeContext | MergeRange[],
): CellPoint | null {
  const pointer = pointerFromMouseEvent(e, canvasRect, layout)
  return cellPointFromCanvasPointer(pointer, layout, metrics, merge)
}

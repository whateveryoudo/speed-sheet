import type { MergeRange } from '@speed-sheet/shared'
import { MergeContext } from '../../merge'
import type { GridLayout } from '../grid-layout'
import { canvasPointToCell, gridCellX, gridCellY, resolveMetrics } from '../layout-metrics'

export function cellFromPoint(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  layout: GridLayout,
): { r: number; c: number } {
  const M = resolveMetrics(layout)
  return canvasPointToCell(
    layout,
    M,
    clientX - canvasRect.left,
    clientY - canvasRect.top,
  )
}

export function colToLetter(c: number): string {
  let s = ''
  let n = c
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

export function cellRect(
  r: number,
  c: number,
  layout: GridLayout,
  merge?: MergeContext | MergeRange[],
): { x: number; y: number; w: number; h: number } {
  const M = resolveMetrics(layout)
  const mc =
    merge instanceof MergeContext ? merge : MergeContext.fromRanges(merge ?? [])
  if (!mc.isEmpty) {
    const m = mc.at(r, c)
    if (m) return mc.pixelRect(m, layout, M)
  }
  return {
    x: layout.rowHeaderWidth + M.colLeft(c),
    y: layout.columnHeaderHeight + M.rowTop(r),
    w: M.colWidth(c),
    h: M.rowHeight(r),
  }
}

/** 单元格在视口 canvas 上的矩形（含冻结偏移，用于气泡/浮层定位） */
export function cellViewportRect(
  r: number,
  c: number,
  layout: GridLayout,
  merge?: MergeContext | MergeRange[],
): { x: number; y: number; w: number; h: number } {
  const M = resolveMetrics(layout)
  const mc =
    merge instanceof MergeContext ? merge : MergeContext.fromRanges(merge ?? [])
  return mc.pixelRectAtCell(r, c, layout, M)
}

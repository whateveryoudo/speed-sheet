import type { GridLayout } from './grid-layout'
import type { GridMetrics } from './grid-metrics'

const DEFAULT_HIT_PX = 5

/** Row index whose bottom edge is under the pointer (row header strip). */
export function hitRowResizeHandle(
  canvasX: number,
  canvasY: number,
  layout: GridLayout,
  metrics: GridMetrics,
  hitPx = DEFAULT_HIT_PX,
): number | null {
  const { rowHeaderWidth: RHW, columnHeaderHeight: CHH, scrollY: sy } = layout
  if (canvasX < 0 || canvasX > RHW || canvasY < CHH) return null

  for (let r = 0; r < metrics.totalRows; r++) {
    const edge = CHH + metrics.rowBottom(r) - sy
    if (Math.abs(canvasY - edge) <= hitPx) return r
  }
  return null
}

/** Col index whose right edge is under the pointer (column header strip). */
export function hitColResizeHandle(
  canvasX: number,
  canvasY: number,
  layout: GridLayout,
  metrics: GridMetrics,
  hitPx = DEFAULT_HIT_PX,
): number | null {
  const { rowHeaderWidth: RHW, columnHeaderHeight: CHH, scrollX: sx } = layout
  if (canvasY < 0 || canvasY > CHH || canvasX < RHW) return null

  for (let c = 0; c < metrics.totalCols; c++) {
    const edge = RHW + metrics.colRight(c) - sx
    if (Math.abs(canvasX - edge) <= hitPx) return c
  }
  return null
}

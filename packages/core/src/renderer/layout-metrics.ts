import type { GridLayout } from './grid-layout'
import { buildGridMetrics, type GridMetrics } from './grid-metrics'

export function resolveMetrics(layout: GridLayout): GridMetrics {
  if (layout.metrics) return layout.metrics
  return buildGridMetrics({
    totalRows: layout.totalRows,
    totalCols: layout.totalCols,
    defaultRowHeight: layout.defaultRowHeight,
    defaultColWidth: layout.defaultColWidth,
  })
}

export function gridCellX(layout: GridLayout, M: GridMetrics, c: number): number {
  return layout.rowHeaderWidth + M.colLeft(c) - layout.scrollX
}

export function gridCellY(layout: GridLayout, M: GridMetrics, r: number): number {
  return layout.columnHeaderHeight + M.rowTop(r) - layout.scrollY
}

export function selectionBox(
  layout: GridLayout,
  M: GridMetrics,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: gridCellX(layout, M, c0),
    y: gridCellY(layout, M, r0),
    w: M.colRight(c1) - M.colLeft(c0),
    h: M.rowBottom(r1) - M.rowTop(r0),
  }
}

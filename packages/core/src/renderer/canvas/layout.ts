import type { GridLayout } from '../grid-layout'
import { getVisibleRangeFromMetrics } from '../grid-metrics'
import { resolveMetrics } from '../layout-metrics'

/** Visible row/col index range (inclusive) from scroll + viewport */
export function getVisibleRange(layout: GridLayout): {
  rowStart: number
  rowEnd: number
  colStart: number
  colEnd: number
} {
  return getVisibleRangeFromMetrics(resolveMetrics(layout), layout)
}

export function defaultLayout(overrides?: Partial<GridLayout>): GridLayout {
  const base: GridLayout = {
    rowHeaderWidth: 46,
    columnHeaderHeight: 25,
    defaultColWidth: 120,
    defaultRowHeight: 25,
    totalRows: 200,
    totalCols: 30,
    scrollX: 0,
    scrollY: 0,
    viewportW: 800,
    viewportH: 600,
  }
  if (!overrides) return base
  const patch = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined),
  ) as Partial<GridLayout>
  return { ...base, ...patch }
}

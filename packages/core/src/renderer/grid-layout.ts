import type { GridMetrics } from './grid-metrics'

export interface GridLayout {
  rowHeaderWidth: number
  columnHeaderHeight: number
  defaultColWidth: number
  defaultRowHeight: number
  totalRows: number
  totalCols: number
  scrollX: number
  scrollY: number
  viewportW: number
  viewportH: number
  metrics?: GridMetrics
}

import type { FreezeState } from '@speed-sheet/shared'
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
  /** 行列冻结：xSplit/ySplit 为左侧/顶部冻结数量 */
  freeze?: FreezeState | null
}

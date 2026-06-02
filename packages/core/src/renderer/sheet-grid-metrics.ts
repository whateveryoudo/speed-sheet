import type { Sheet } from '../Sheet'
import { buildGridMetrics, type GridMetrics } from './grid-metrics'
import type { GridLayout } from './grid-layout'

export function buildSheetGridMetrics(
  sheet: Sheet,
  layout: Pick<GridLayout, 'defaultRowHeight' | 'defaultColWidth'>,
): GridMetrics {
  const state = sheet.state
  const hidden = sheet.getFilterHiddenRows()
  return buildGridMetrics({
    totalRows: state.getRowCount(),
    totalCols: state.getColCount(),
    defaultRowHeight: layout.defaultRowHeight,
    defaultColWidth: layout.defaultColWidth,
    getRowHeight: (r) => state.rowHeight.get(String(r)) as number | undefined,
    getColWidth: (c) => state.colWidth.get(String(c)) as number | undefined,
    isRowHidden: (r) => hidden.has(r),
  })
}

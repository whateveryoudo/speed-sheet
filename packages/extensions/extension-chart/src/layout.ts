import {
  buildSheetGridMetrics,
  type GridLayout,
  type Sheet,
} from '@speed-sheet/core'
import type { SheetChartItem } from '@speed-sheet/shared'

export interface SheetChartViewportRect {
  left: number
  top: number
  width: number
  height: number
}

/** 计算图表在视口中的绝对定位像素位置（支持随表格滚动/冻结单元格） */
export function computeSheetChartViewportRect(
  sheet: Sheet,
  layout: GridLayout,
  chart: SheetChartItem,
): SheetChartViewportRect {
  const mc = sheet.createMergeContext()
  const M = buildSheetGridMetrics(sheet, layout)
  const cell = mc.pixelRectAtCell(chart.row, chart.col, layout, M)
  return {
    left: cell.x + (chart.offsetLeft ?? 0),
    top: cell.y + (chart.offsetTop ?? 0),
    width: chart.width,
    height: chart.height,
  }
}

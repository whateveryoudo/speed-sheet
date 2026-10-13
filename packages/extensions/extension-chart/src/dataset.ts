import type { Sheet, SheetState } from '@speed-sheet/core'
import type { SheetChartItem, SheetChartConfig } from '@speed-sheet/shared'

export interface ExtractedChartDataset {
  /** 分类轴数据标签（例如 X 轴项 ['手机', '电脑', '平板']） */
  categories: string[]
  /** 系列数据列表（例如 [{ name: 'Q1', data: [100, 80, 50] }]） */
  seriesData: Array<{
    name: string
    data: (number | null)[]
  }>
}

/** 从 Sheet 选区范围中提取图表所需的结构化数据集 */
export function extractChartDataset(
  state: SheetState,
  range: SheetChartItem['range'],
): ExtractedChartDataset {
  const { row, column, hasHeaderRow = true, hasHeaderCol = true } = range
  const r0 = Math.min(row[0], row[1])
  const r1 = Math.max(row[0], row[1])
  const c0 = Math.min(column[0], column[1])
  const c1 = Math.max(column[0], column[1])

  const dataStartRow = hasHeaderRow ? r0 + 1 : r0
  const dataStartCol = hasHeaderCol ? c0 + 1 : c0

  // 1. 提取分类轴 categories
  const categories: string[] = []
  for (let r = dataStartRow; r <= r1; r++) {
    if (hasHeaderCol) {
      const cell = state.getCellData(r, c0)
      const label = cell?.m ?? (cell?.v != null ? String(cell.v) : `第 ${r + 1} 行`)
      categories.push(label)
    } else {
      categories.push(`第 ${r + 1} 行`)
    }
  }

  // 2. 提取系列数据 seriesData
  const seriesData: ExtractedChartDataset['seriesData'] = []
  for (let c = dataStartCol; c <= c1; c++) {
    let seriesName = `系列 ${c - dataStartCol + 1}`
    if (hasHeaderRow) {
      const headCell = state.getCellData(r0, c)
      if (headCell?.m || headCell?.v != null) {
        seriesName = headCell.m ?? String(headCell.v)
      }
    }

    const data: (number | null)[] = []
    for (let r = dataStartRow; r <= r1; r++) {
      const cell = state.getCellData(r, c)
      const val = cell?.v
      if (typeof val === 'number' && Number.isFinite(val)) {
        data.push(val)
      } else if (typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
        data.push(Number(val))
      } else {
        data.push(null)
      }
    }

    seriesData.push({ name: seriesName, data })
  }

  return { categories, seriesData }
}

import type { Selection } from '@speed-sheet/shared'
import type { SheetState } from '@speed-sheet/core'
import { isCellEmpty } from './cell-value'

export interface ResolvedFilterScope {
  columns: number[]
  dataStartRow: number
  dataEndRow: number
  headerRow: number | null
  rangeLabel: string
  /** 用户是否为单格点选（非框选） */
  singleCell: boolean
}

/** 将筛选范围同步为画布选区（框选场景保留蓝框） */
export function filterScopeToSelection(scope: ResolvedFilterScope): Selection {
  const c0 = scope.columns[0]!
  const c1 = scope.columns[scope.columns.length - 1]!
  const r0 = scope.headerRow != null ? scope.headerRow : Math.max(0, scope.dataStartRow - 1)
  const r1 = scope.dataEndRow
  return {
    row: [r0, r1],
    column: [c0, c1],
    anchor: { r: r0, c: c0 },
  }
}

function normRange(sel: Selection): {
  r0: number
  r1: number
  c0: number
  c1: number
  singleCell: boolean
} {
  const r0 = Math.min(sel.row[0], sel.row[1])
  const r1 = Math.max(sel.row[0], sel.row[1])
  const c0 = Math.min(sel.column[0], sel.column[1])
  const c1 = Math.max(sel.column[0], sel.column[1])
  return { r0, r1, c0, c1, singleCell: r0 === r1 && c0 === c1 }
}

/**
 * 解析筛选列与数据行范围。
 * - 单格：仅该列，从第 2 行起截断到首个空单元格（不含表头行 0）
 * - 框选：列取选区列，行取选区行（含表头）
 */
export function resolveFilterScope(state: SheetState, selection: Selection): ResolvedFilterScope {
  const { r0, r1, c0, c1, singleCell } = normRange(selection)
  const columns: number[] = []
  for (let c = c0; c <= c1; c++) columns.push(c)

  const rowCount = state.getRowCount()

  if (singleCell) {
    const c = c0
    const dataStartRow = 1
    let dataEndRow = Math.max(dataStartRow, rowCount - 1)
    for (let r = dataStartRow; r < rowCount; r++) {
      if (isCellEmpty(state.getCellData(r, c))) {
        dataEndRow = Math.max(dataStartRow - 1, r - 1)
        break
      }
    }
    if (dataEndRow < dataStartRow) dataEndRow = dataStartRow
    return {
      columns,
      dataStartRow,
      dataEndRow,
      headerRow: null,
      rangeLabel: `${dataStartRow + 1}:${dataEndRow + 1}`,
      singleCell: true,
    }
  }

  return {
    columns,
    dataStartRow: r0,
    dataEndRow: r1,
    headerRow: r0,
    rangeLabel: `${r0 + 1}:${r1 + 1}`,
    singleCell: false,
  }
}

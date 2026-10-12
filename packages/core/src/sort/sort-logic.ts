import type { Selection } from '@speed-sheet/shared'
import type { SheetState } from '../state/SheetState'

export interface CellCoord {
  r: number
  c: number
}

export interface CellRangeBox {
  r0: number
  r1: number
  c0: number
  c1: number
}

export interface SortOptions {
  range: CellRangeBox
  sortCol: number
  ascending: boolean
  hasHeader?: boolean
}

/** 检查单元格是否有有效可见内容或公式 */
export function cellHasValue(state: SheetState, r: number, c: number): boolean {
  const data = state.getCellData(r, c)
  if (!data) return false
  if (data.f != null && String(data.f).length > 0) return true
  const v = data.v
  return v !== null && v !== undefined && v !== ''
}

/** 格式化选区为可读字符串（如 A1:C10） */
export function formatRangeLabel(box: CellRangeBox): string {
  const colName = (col: number) => {
    let s = ''
    let n = col
    while (n >= 0) {
      s = String.fromCharCode(65 + (n % 26)) + s
      n = Math.floor(n / 26) - 1
    }
    return s
  }
  const start = `${colName(box.c0)}${box.r0 + 1}`
  const end = `${colName(box.c1)}${box.r1 + 1}`
  if (box.r0 === box.r1 && box.c0 === box.c1) return start
  return `${start}:${end}`
}

/**
 * 依据当前选区计算扩散后的连续数据矩形块。
 *
 * 算法原理（类似于 Excel CurrentRegion）：
 * 从选区初始矩形出发，不断探测上、下、左、右相邻行/列是否存在非空单元格：
 * - 如果相邻行/列包含非空数据，则将该行/列合并进入矩形；
 * - 持续迭代直到四周均为完全空白，或者到达表格边界。
 */
export function detectExpandedRange(state: SheetState, sel: Selection): CellRangeBox {
  const totalRows = state.getRowCount()
  const totalCols = state.getColCount()

  let r0 = Math.min(sel.row[0], sel.row[1])
  let r1 = Math.max(sel.row[0], sel.row[1])
  let c0 = Math.min(sel.column[0], sel.column[1])
  let c1 = Math.max(sel.column[0], sel.column[1])

  let expanded = true
  while (expanded) {
    expanded = false

    // 检查上方行 (r0 - 1)
    if (r0 > 0) {
      let hasData = false
      for (let c = c0; c <= c1; c++) {
        if (cellHasValue(state, r0 - 1, c)) {
          hasData = true
          break
        }
      }
      if (hasData) {
        r0--
        expanded = true
        continue
      }
    }

    // 检查下方行 (r1 + 1)
    if (r1 < totalRows - 1) {
      let hasData = false
      for (let c = c0; c <= c1; c++) {
        if (cellHasValue(state, r1 + 1, c)) {
          hasData = true
          break
        }
      }
      if (hasData) {
        r1++
        expanded = true
        continue
      }
    }

    // 检查左侧列 (c0 - 1)
    if (c0 > 0) {
      let hasData = false
      for (let r = r0; r <= r1; r++) {
        if (cellHasValue(state, r, c0 - 1)) {
          hasData = true
          break
        }
      }
      if (hasData) {
        c0--
        expanded = true
        continue
      }
    }

    // 检查右侧列 (c1 + 1)
    if (c1 < totalCols - 1) {
      let hasData = false
      for (let r = r0; r <= r1; r++) {
        if (cellHasValue(state, r, c1 + 1)) {
          hasData = true
          break
        }
      }
      if (hasData) {
        c1++
        expanded = true
        continue
      }
    }
  }

  return { r0, r1, c0, c1 }
}

/** 规范化选区矩形 */
export function normalizeSelectionBox(sel: Selection): CellRangeBox {
  return {
    r0: Math.min(sel.row[0], sel.row[1]),
    r1: Math.max(sel.row[0], sel.row[1]),
    c0: Math.min(sel.column[0], sel.column[1]),
    c1: Math.max(sel.column[0], sel.column[1]),
  }
}

/** 判断两个矩形是否一致 */
export function isSameRange(a: CellRangeBox, b: CellRangeBox): boolean {
  return a.r0 === b.r0 && a.r1 === b.r1 && a.c0 === b.c0 && a.c1 === b.c1
}

/**
 * 比较两个单元格内容大小，对齐 Excel：
 * - 纯数字按数字大小比较；
 * - 字符串按本地拼音/字符集比较；
 * - 空单元格始终排在末尾。
 */
export function compareCellValues(a: unknown, b: unknown, ascending: boolean): number {
  const isAEmpty = a === null || a === undefined || a === ''
  const isBEmpty = b === null || b === undefined || b === ''

  if (isAEmpty && isBEmpty) return 0
  if (isAEmpty) return 1 // 空值永远沉底
  if (isBEmpty) return -1

  const numA = Number(a)
  const numB = Number(b)
  const isANum = !Number.isNaN(numA) && typeof a !== 'boolean'
  const isBNum = !Number.isNaN(numB) && typeof b !== 'boolean'

  if (isANum && isBNum) {
    return ascending ? numA - numB : numB - numA
  }

  const strA = String(a)
  const strB = String(b)
  const cmp = strA.localeCompare(strB, 'zh-CN', { numeric: true })
  return ascending ? cmp : -cmp
}

/**
 * 执行区域排序：
 * - 在指定的矩形 range (r0~r1, c0~c1) 内；
 * - 依据 sortCol 列的值进行行级重新排列；
 * - 若有第一行是否为表头的识别（或者外部传入 hasHeader），则从实际数据行开始排；
 * - 移动行时，整行的每个单元格数据（数据和格式）同步重新映射定位；
 * - 全部操作在同一个 Yjs 用户事务内执行，支持撤销/重做。
 */
export function sortRange(state: SheetState, options: SortOptions): void {
  const { range, sortCol, ascending, hasHeader } = options
  const startRow = hasHeader ? range.r0 + 1 : range.r0
  const endRow = range.r1

  if (startRow >= endRow) return

  // 1. 抓取待排行的行级快照
  interface RowSnapshot {
    originRow: number
    sortVal: unknown
    cells: Map<number, ReturnType<SheetState['getCellData']>>
  }

  const rows: RowSnapshot[] = []
  for (let r = startRow; r <= endRow; r++) {
    const rowCells = new Map<number, ReturnType<SheetState['getCellData']>>()
    for (let c = range.c0; c <= range.c1; c++) {
      const data = state.getCellData(r, c)
      if (data) {
        rowCells.set(c, { ...data })
      }
    }
    const sortCell = state.getCellData(r, sortCol)
    const sortVal = sortCell ? (sortCell.v ?? sortCell.m ?? '') : ''
    rows.push({
      originRow: r,
      sortVal,
      cells: rowCells,
    })
  }

  // 2. 排序（稳定排序）
  rows.sort((a, b) => {
    const cmp = compareCellValues(a.sortVal, b.sortVal, ascending)
    if (cmp !== 0) return cmp
    return a.originRow - b.originRow
  })

  // 3. 将排好序的新行写回 Yjs
  for (let i = 0; i < rows.length; i++) {
    const targetRow = startRow + i
    const rowData = rows[i]!
    for (let c = range.c0; c <= range.c1; c++) {
      const targetCell = rowData.cells.get(c)
      if (targetCell) {
        state.setCell(targetRow, c, targetCell, true)
      } else {
        state.deleteCell(targetRow, c, true)
      }
    }
  }
}

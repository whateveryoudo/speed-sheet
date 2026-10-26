import {
  allocRowId,
  allocColId,
  type WorkbookSnapshot,
  type SheetSnapshot,
  type CellAttributes,
} from '@speed-sheet/shared'

/**
 * 解析标准 CSV 文本为二维字符串数组（支持双引号转义、逗号、回车换行）
 */
export function parseCsvText(csvText: string): string[][] {
  const clean = csvText.replace(/^\uFEFF/, '') // 去除 UTF-8 BOM
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentVal = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const nextChar = clean[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // 转义双引号 "" -> "
          currentVal += '"'
          i++
        } else {
          // 引号闭合
          inQuotes = false
        }
      } else {
        currentVal += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        currentRow.push(currentVal)
        currentVal = ''
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++
        }
        currentRow.push(currentVal)
        currentVal = ''
        rows.push(currentRow)
        currentRow = []
      } else if (char === '\n') {
        currentRow.push(currentVal)
        currentVal = ''
        rows.push(currentRow)
        currentRow = []
      } else {
        currentVal += char
      }
    }
  }

  // 结尾残留
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal)
    rows.push(currentRow)
  }

  return rows
}

/**
 * 将 CSV 文本解析为 WorkbookSnapshot
 */
export function importCsvToSnapshot(
  csvText: string,
  options?: { sheetName?: string },
): WorkbookSnapshot {
  const grid = parseCsvText(csvText)

  const rawRowCount = grid.length
  let rawColCount = 0
  for (const row of grid) {
    if (row.length > rawColCount) rawColCount = row.length
  }

  const rowCount = Math.max(30, rawRowCount)
  const colCount = Math.max(20, rawColCount)

  const rowOrder: string[] = []
  const colOrder: string[] = []
  for (let r = 0; r < rowCount; r++) rowOrder.push(allocRowId())
  for (let c = 0; c < colCount; c++) colOrder.push(allocColId())

  const cells: Record<string, CellAttributes> = {}

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]
    if (!row) continue
    for (let c = 0; c < row.length; c++) {
      const raw = row[c]
      if (raw === undefined || raw === '') continue

      const rowId = rowOrder[r]
      const colId = colOrder[c]
      const key = `${rowId}:${colId}`

      // 自动类型推导：数值、布尔、文本
      let v: any = raw
      const num = Number(raw)
      if (!isNaN(num) && raw.trim() !== '') {
        v = num
      } else if (raw.toLowerCase() === 'true') {
        v = true
      } else if (raw.toLowerCase() === 'false') {
        v = false
      }

      cells[key] = {
        v,
        m: String(v),
      }
    }
  }

  const sheet: SheetSnapshot = {
    id: `sheet_csv_${Date.now()}`,
    name: options?.sheetName || 'Sheet1',
    order: 0,
    rowOrder,
    colOrder,
    cells,
    config: {
      merges: {},
      rowHeight: {},
      colWidth: {},
      rowHidden: {},
      colHidden: {},
      borders: [],
      filters: [],
    },
  }

  return {
    version: 2,
    sheets: [sheet],
    activeSheetId: sheet.id,
  }
}

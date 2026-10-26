import type { WorkbookSnapshot } from '@speed-sheet/shared'

/**
 * 将指定工作表导出为标准 CSV 字符串（带 UTF-8 BOM，防止 Excel 打开中文乱码）
 */
export function exportSnapshotToCsv(
  snapshot: WorkbookSnapshot,
  options?: {
    sheetIdOrIndex?: string | number
    withBom?: boolean
  },
): string {
  if (!snapshot.sheets || snapshot.sheets.length === 0) {
    return ''
  }

  let sheet = snapshot.sheets[0]
  if (options?.sheetIdOrIndex !== undefined) {
    if (typeof options.sheetIdOrIndex === 'number') {
      sheet = snapshot.sheets[options.sheetIdOrIndex] ?? sheet
    } else {
      const found = snapshot.sheets.find((s) => s.id === options.sheetIdOrIndex)
      if (found) sheet = found
    }
  } else if (snapshot.activeSheetId) {
    const found = snapshot.sheets.find((s) => s.id === snapshot.activeSheetId)
    if (found) sheet = found
  }

  const { rowOrder, colOrder, cells } = sheet
  const rows: string[] = []

  for (let r = 0; r < rowOrder.length; r++) {
    const rowId = rowOrder[r]
    const rowCells: string[] = []
    let hasValue = false

    for (let c = 0; c < colOrder.length; c++) {
      const colId = colOrder[c]
      const cell = cells[`${rowId}:${colId}`]
      const rawVal = cell?.m ?? cell?.v ?? ''
      const strVal = String(rawVal)
      if (strVal !== '') {
        hasValue = true
      }
      // 转义双引号，并在包含逗号、换行或双引号时用双引号包裹
      if (strVal.includes('"') || strVal.includes(',') || strVal.includes('\n') || strVal.includes('\r')) {
        rowCells.push(`"${strVal.replace(/"/g, '""')}"`)
      } else {
        rowCells.push(strVal)
      }
    }

    if (hasValue || r === 0) {
      rows.push(rowCells.join(','))
    }
  }

  const csvContent = rows.join('\r\n')
  const withBom = options?.withBom ?? true
  return withBom ? `\uFEFF${csvContent}` : csvContent
}

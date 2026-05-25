import type { Sheet } from '../Sheet'
import type { CellAttributes, Selection } from '@speed-sheet/shared'

/** 与 Luckysheet `getRange()` 单项结构对齐 */
export interface LuckysheetRange {
  row: [number, number]
  column: [number, number]
}

export function normalizeRange(sel: Selection): LuckysheetRange {
  return {
    row: [Math.min(sel.row[0], sel.row[1]), Math.max(sel.row[0], sel.row[1])],
    column: [Math.min(sel.column[0], sel.column[1]), Math.max(sel.column[0], sel.column[1])],
  }
}

function resolveRange(sheet: Sheet, range?: LuckysheetRange): LuckysheetRange {
  return range ?? normalizeRange(sheet.state.getSelection())
}

function cellDisplay(data: CellAttributes | null): string | number | null {
  if (!data) return null
  if (data.m != null && data.m !== '') return String(data.m)
  const v = data.v
  if (v == null || v === '') return null
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return v
}

/** Luckysheet 风格 API（也可继续用 sheet.chain()） */
export const sheetCompatApi = {
  /** 当前选区（Luckysheet 返回数组，此处为单选区） */
  getRange(sheet: Sheet): LuckysheetRange[] {
    return [normalizeRange(sheet.state.getSelection())]
  },

  getRangeValue(sheet: Sheet, range?: LuckysheetRange): (string | number | null)[][] {
    const { row, column } = resolveRange(sheet, range)
    const rows: (string | number | null)[][] = []
    for (let r = row[0]; r <= row[1]; r++) {
      const line: (string | number | null)[] = []
      for (let c = column[0]; c <= column[1]; c++) {
        line.push(cellDisplay(sheet.state.getCellData(r, c)))
      }
      rows.push(line)
    }
    return rows
  },

  setRangeValue(
    sheet: Sheet,
    data: (string | number | null)[][],
    range?: LuckysheetRange,
  ): void {
    const { row, column } = resolveRange(sheet, range)
    const chain = sheet.chain()
    for (let i = 0; i < data.length; i++) {
      for (let j = 0; j < (data[i]?.length ?? 0); j++) {
        const v = data[i][j]
        if (v == null) continue
        chain.setCellValue({
          r: row[0] + i,
          c: column[0] + j,
          value: String(v),
        })
      }
    }
    chain.run()
  },

  getCellValue(sheet: Sheet, r: number, c: number): string | number | null {
    return cellDisplay(sheet.state.getCellData(r, c))
  },

  setCellValue(sheet: Sheet, r: number, c: number, value: string | number): void {
    sheet.chain().setCellValue({ r, c, value: String(value) }).run()
  },

  setRange(sheet: Sheet, range: LuckysheetRange): void {
    sheet
      .chain()
      .selectRange({
        row: range.row,
        column: range.column,
        anchor: { r: range.row[0], c: range.column[0] },
      })
      .run()
  },

  clearRange(sheet: Sheet, range?: LuckysheetRange): void {
    const { row, column } = resolveRange(sheet, range)
    const chain = sheet.chain()
    for (let r = row[0]; r <= row[1]; r++) {
      for (let c = column[0]; c <= column[1]; c++) {
        chain.clearCell({ r, c })
      }
    }
    chain.run()
  },

  insertRow(sheet: Sheet, row?: number, count = 1): void {
    const at = row ?? sheet.state.getSelection().row[0]
    sheet.chain().insertRows({ at, count }).run()
  },

  deleteRow(sheet: Sheet, row?: number, count = 1): void {
    const at = row ?? sheet.state.getSelection().row[0]
    sheet.chain().deleteRows({ at, count }).run()
  },

  insertColumn(sheet: Sheet, col?: number, count = 1): void {
    const at = col ?? sheet.state.getSelection().column[0]
    sheet.chain().insertCols({ at, count }).run()
  },

  deleteColumn(sheet: Sheet, col?: number, count = 1): void {
    const at = col ?? sheet.state.getSelection().column[0]
    sheet.chain().deleteCols({ at, count }).run()
  },

  copy(sheet: Sheet): void {
    sheet.chain().copy().run()
  },

  cut(sheet: Sheet): void {
    sheet.chain().cut().run()
  },

  paste(sheet: Sheet): void {
    sheet.chain().paste().run()
  },

  addSheet(sheet: Sheet, name?: string): string {
    return sheet.addSheet(name)
  },
}

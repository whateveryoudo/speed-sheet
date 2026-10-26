import ExcelJS from 'exceljs'
import {
  allocRowId,
  allocColId,
  type WorkbookSnapshot,
  type SheetSnapshot,
  type CellAttributes,
  type MergeRange,
  type SheetConfig,
} from '@speed-sheet/shared'
import { argbToHex } from '../utils/color'

function colLetterToNumber(letter: string): number {
  let col = 0
  const clean = letter.toUpperCase()
  for (let i = 0; i < clean.length; i++) {
    col = col * 26 + (clean.charCodeAt(i) - 64)
  }
  return col
}

function parseA1Range(rangeStr: string): { r: number; c: number; rs: number; cs: number } | null {
  const match = rangeStr.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i)
  if (!match) return null

  const c1 = colLetterToNumber(match[1]) - 1
  const r1 = parseInt(match[2], 10) - 1
  const c2 = colLetterToNumber(match[3]) - 1
  const r2 = parseInt(match[4], 10) - 1

  const minR = Math.min(r1, r2)
  const maxR = Math.max(r1, r2)
  const minC = Math.min(c1, c2)
  const maxC = Math.max(c1, c2)

  return {
    r: minR,
    c: minC,
    rs: maxR - minR + 1,
    cs: maxC - minC + 1,
  }
}

/**
 * 将 Excel (.xlsx) 二进制数据解析为 WorkbookSnapshot
 * 支持在浏览器与 Node.js 双端执行
 */
export async function importXlsxToSnapshot(
  data: ArrayBuffer | Uint8Array,
): Promise<WorkbookSnapshot> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(data as any)

  const sheets: SheetSnapshot[] = []

  workbook.eachSheet((worksheet, sheetId) => {
    const rawRowCount = worksheet.rowCount || 0
    const rawColCount = worksheet.columnCount || 0

    // 保证表格至少有 30 行 20 列的规整视口
    const rowCount = Math.max(30, rawRowCount)
    const colCount = Math.max(20, rawColCount)

    const rowOrder: string[] = []
    const colOrder: string[] = []
    for (let r = 0; r < rowCount; r++) rowOrder.push(allocRowId())
    for (let c = 0; c < colCount; c++) colOrder.push(allocColId())

    const cells: Record<string, CellAttributes> = {}
    const rowHeight: Record<string, number> = {}
    const colWidth: Record<string, number> = {}
    const merges: Record<string, MergeRange> = {}

    // 1. 读取行高
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const r = rowNumber - 1
      if (r < rowCount && row.height) {
        // pt 转 px: 1 pt ≈ 1.33 px
        rowHeight[String(r)] = Math.round(row.height / 0.75)
      }
    })

    // 2. 读取列宽
    if (worksheet.columns) {
      worksheet.columns.forEach((col, idx) => {
        if (idx < colCount && col.width) {
          // char 转 px: 1 char ≈ 8 px
          colWidth[String(idx)] = Math.round(col.width * 8)
        }
      })
    }

    // 3. 读取合并单元格
    const rawMerges = (worksheet.model as any)?.merges || []
    for (const mStr of rawMerges) {
      if (typeof mStr === 'string') {
        const m = parseA1Range(mStr)
        if (m) {
          merges[`${m.r}_${m.c}`] = m
        }
      }
    }

    // 4. 读取单元格内容与样式
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      const r = rowNumber - 1
      if (r >= rowCount) return

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const c = colNumber - 1
        if (c >= colCount) return

        const rowId = rowOrder[r]
        const colId = colOrder[c]
        const key = `${rowId}:${colId}`

        const cellAttr: CellAttributes = { v: null }

        // 解析值与公式
        if (cell.type === ExcelJS.ValueType.Formula) {
          cellAttr.f = `=${cell.formula}`
          cellAttr.v = cell.result !== undefined ? (cell.result as any) : null
          cellAttr.m = cellAttr.v != null ? String(cellAttr.v) : ''
        } else if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object') {
            // 富文本对象或超链接对象
            if ('richText' in cell.value && Array.isArray((cell.value as any).richText)) {
              cellAttr.v = (cell.value as any).richText.map((t: any) => t.text).join('')
            } else if ('text' in cell.value) {
              cellAttr.v = (cell.value as any).text
            } else if (cell.value instanceof Date) {
              cellAttr.v = cell.value.toISOString().split('T')[0]
            } else {
              cellAttr.v = String(cell.value)
            }
          } else {
            cellAttr.v = cell.value as any
          }
          cellAttr.m = cellAttr.v != null ? String(cellAttr.v) : ''
        }

        // 解析字体
        if (cell.font) {
          if (cell.font.name) cellAttr.ff = cell.font.name
          if (cell.font.size) cellAttr.fs = cell.font.size
          if (cell.font.bold) cellAttr.bl = 1
          if (cell.font.italic) cellAttr.it = 1
          if (cell.font.underline) cellAttr.un = 1
          if (cell.font.strike) cellAttr.cl = 1
          if (cell.font.color?.argb) {
            const hex = argbToHex(cell.font.color.argb)
            if (hex) cellAttr.fc = hex
          }
        }

        // 解析背景填充
        if (cell.fill && cell.fill.type === 'pattern') {
          const fg = (cell.fill as ExcelJS.FillPattern).fgColor
          if (fg?.argb) {
            const hex = argbToHex(fg.argb)
            if (hex) cellAttr.bg = hex
          }
        }

        // 解析对齐
        if (cell.alignment) {
          if (cell.alignment.horizontal === 'center') cellAttr.ht = 0
          else if (cell.alignment.horizontal === 'left') cellAttr.ht = 1
          else if (cell.alignment.horizontal === 'right') cellAttr.ht = 2

          if (cell.alignment.vertical === 'middle') cellAttr.vt = 0
          else if (cell.alignment.vertical === 'top') cellAttr.vt = 1
          else if (cell.alignment.vertical === 'bottom') cellAttr.vt = 2

          if (cell.alignment.wrapText) cellAttr.tb = 1
        }

        // 解析数字格式
        if (cell.numFmt && cell.numFmt !== 'General') {
          cellAttr.ct = {
            fa: cell.numFmt,
            t: typeof cellAttr.v === 'number' ? 'n' : 'g',
          }
        }

        cells[key] = cellAttr
      })
    })

    const config: SheetConfig = {
      merges,
      rowHeight,
      colWidth,
      rowHidden: {},
      colHidden: {},
      borders: [],
      filters: [],
    }

    sheets.push({
      id: `sheet_${sheetId}_${Date.now()}`,
      name: worksheet.name || `Sheet${sheetId}`,
      order: sheetId,
      rowOrder,
      colOrder,
      cells,
      config,
    })
  })

  // 如果 Excel 文件为空，兜底创建一个空工作表
  if (sheets.length === 0) {
    const rowOrder = Array.from({ length: 30 }, () => allocRowId())
    const colOrder = Array.from({ length: 20 }, () => allocColId())
    sheets.push({
      id: `sheet_default_${Date.now()}`,
      name: 'Sheet1',
      order: 0,
      rowOrder,
      colOrder,
      cells: {},
      config: {
        merges: {},
        rowHeight: {},
        colWidth: {},
        rowHidden: {},
        colHidden: {},
        borders: [],
        filters: [],
      },
    })
  }

  return {
    version: 2,
    sheets,
    activeSheetId: sheets[0].id,
  }
}

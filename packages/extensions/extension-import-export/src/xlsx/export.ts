import ExcelJS from 'exceljs'
import type { WorkbookSnapshot, SheetSnapshot, BorderInfo, BorderSegment } from '@speed-sheet/shared'
import { hexToArgb } from '../utils/color'

export interface XlsxExportOptions {
  creator?: string
  lastModifiedBy?: string
}

function colToLetter(c: number): string {
  let letter = ''
  let temp = c
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

/**
 * 将 SpeedSheet 内部存储公式（如 =SUM(#r_t0:c_t0~r_t2:c_t0#)）转换为标准 Excel A1 公式（如 SUM(A1:A3)）
 */
function convertInternalFormulaToA1(
  rawFormula: string,
  sheetSnap: SheetSnapshot,
  allSheets: SheetSnapshot[],
): string {
  if (!rawFormula.includes('#')) {
    return rawFormula
  }

  const sheetMetaMap = new Map<string, {
    name: string
    rowMap: Map<string, number>
    colMap: Map<string, number>
  }>()

  for (const s of allSheets) {
    const rowMap = new Map<string, number>()
    const colMap = new Map<string, number>()
    for (let r = 0; r < s.rowOrder.length; r++) rowMap.set(s.rowOrder[r], r)
    for (let c = 0; c < s.colOrder.length; c++) colMap.set(s.colOrder[c], c)
    sheetMetaMap.set(s.id, { name: s.name || 'Sheet', rowMap, colMap })
  }

  const currentMeta = sheetMetaMap.get(sheetSnap.id) || {
    name: sheetSnap.name || 'Sheet',
    rowMap: new Map(),
    colMap: new Map(),
  }

  return rawFormula.replace(
    /#(?:@([^|#]+)\|)?(\$?)([^:~#]+):(\$?)([^:~#]+)(?:~(\$?)([^:~#]+):(\$?)([^:~#]+))?#/g,
    (_, targetSheetId, rLock0, rId0, cLock0, cId0, rLock1, rId1, cLock1, cId1) => {
      const targetMeta = targetSheetId ? sheetMetaMap.get(targetSheetId) : currentMeta
      if (!targetMeta) return _

      const r0 = targetMeta.rowMap.get(rId0)
      const c0 = targetMeta.colMap.get(cId0)
      if (r0 === undefined || c0 === undefined) return _

      const p0 = `${cLock0 ? '$' : ''}${colToLetter(c0)}${rLock0 ? '$' : ''}${r0 + 1}`
      const prefix = targetSheetId && targetSheetId !== sheetSnap.id
        ? `'${targetMeta.name.replace(/'/g, "''")}'!`
        : ''

      if (rId1 != null && cId1 != null) {
        const r1 = targetMeta.rowMap.get(rId1)
        const c1 = targetMeta.colMap.get(cId1)
        if (r1 === undefined || c1 === undefined) return _
        const p1 = `${cLock1 ? '$' : ''}${colToLetter(c1)}${rLock1 ? '$' : ''}${r1 + 1}`
        return `${prefix}${p0}:${p1}`
      }

      return `${prefix}${p0}`
    },
  )
}

function mapBorderStyle(styleNum?: number): ExcelJS.BorderStyle {
  switch (styleNum) {
    case 2:
      return 'medium'
    case 3:
      return 'thick'
    case 4:
      return 'double'
    case 5:
      return 'dashed'
    case 6:
      return 'dotted'
    case 1:
    default:
      return 'thin'
  }
}

function mapBorderSegment(seg?: BorderSegment): Partial<ExcelJS.Border> | undefined {
  if (!seg) return undefined
  return {
    style: mapBorderStyle(seg.style),
    color: { argb: hexToArgb(seg.color) || 'FF000000' },
  }
}

/**
 * 将 WorkbookSnapshot 导出为 Excel (.xlsx) 二进制 Buffer
 * 支持在浏览器与 Node.js 双端执行
 */
export async function exportSnapshotToXlsx(
  snapshot: WorkbookSnapshot,
  options?: XlsxExportOptions,
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = options?.creator || 'SpeedSheet'
  workbook.lastModifiedBy = options?.lastModifiedBy || 'SpeedSheet'
  workbook.created = new Date()
  workbook.modified = new Date()

  for (let sIdx = 0; sIdx < snapshot.sheets.length; sIdx++) {
    const sheetSnap = snapshot.sheets[sIdx]
    const worksheet = workbook.addWorksheet(sheetSnap.name || `Sheet${sIdx + 1}`)

    const { rowOrder, colOrder, cells, config } = sheetSnap
    const rowMap = new Map<string, number>()
    const colMap = new Map<string, number>()
    for (let r = 0; r < rowOrder.length; r++) rowMap.set(rowOrder[r], r)
    for (let c = 0; c < colOrder.length; c++) colMap.set(colOrder[c], c)

    // 1. 设置行高 (px 转 pt: 1 pt ≈ 1.33 px -> pt = px * 0.75)
    if (config?.rowHeight) {
      for (const [rStr, px] of Object.entries(config.rowHeight)) {
        const rNum = Number(rStr)
        if (!isNaN(rNum) && rNum >= 0 && px > 0) {
          worksheet.getRow(rNum + 1).height = Math.round(px * 0.75)
        }
      }
    }

    // 2. 设置列宽 (px 转 char: 字符宽 ≈ px / 8)
    if (config?.colWidth) {
      for (const [cStr, px] of Object.entries(config.colWidth)) {
        const cNum = Number(cStr)
        if (!isNaN(cNum) && cNum >= 0 && px > 0) {
          worksheet.getColumn(cNum + 1).width = Math.max(2, Math.round((px / 8) * 10) / 10)
        }
      }
    }

    // 3. 填充单元格值、公式与样式
    for (const [key, cell] of Object.entries(cells)) {
      const [rowId, colId] = key.split(':')
      const r = rowMap.get(rowId)
      const c = colMap.get(colId)
      if (r === undefined || c === undefined) continue

      const excelCell = worksheet.getCell(r + 1, c + 1)

      // 值与公式
      if (cell.f) {
        const a1Formula = convertInternalFormulaToA1(cell.f, sheetSnap, snapshot.sheets)
        const cleanFormula = a1Formula.startsWith('=') ? a1Formula.slice(1) : a1Formula
        excelCell.value = {
          formula: cleanFormula,
          result: (cell.v !== undefined && cell.v !== null) ? cell.v : undefined,
        }
      } else if (cell.v !== undefined && cell.v !== null) {
        excelCell.value = cell.v as any
      }

      // 字体样式
      const font: Partial<ExcelJS.Font> = {
        name: cell.ff || 'Arial',
        size: cell.fs ? Number(cell.fs) : 12,
        bold: cell.bl === 1,
        italic: cell.it === 1,
        underline: cell.un === 1,
        strike: cell.cl === 1,
      }
      if (cell.fc) {
        const argb = hexToArgb(cell.fc)
        if (argb) font.color = { argb }
      }
      excelCell.font = font

      // 填充背景色
      if (cell.bg) {
        const argb = hexToArgb(cell.bg)
        if (argb) {
          excelCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb },
          }
        }
      }

      // 对齐方式
      const alignment: Partial<ExcelJS.Alignment> = {
        wrapText: cell.tb === 1,
      }
      if (cell.ht === 0) alignment.horizontal = 'center'
      else if (cell.ht === 1) alignment.horizontal = 'left'
      else if (cell.ht === 2) alignment.horizontal = 'right'

      if (cell.vt === 0) alignment.vertical = 'middle'
      else if (cell.vt === 1) alignment.vertical = 'top'
      else if (cell.vt === 2) alignment.vertical = 'bottom'
      else alignment.vertical = 'middle'

      excelCell.alignment = alignment

      // 数字格式
      if (cell.ct?.fa && cell.ct.fa !== 'General') {
        excelCell.numFmt = cell.ct.fa
      }
    }

    // 4. 合并单元格
    if (config?.merges) {
      for (const m of Object.values(config.merges)) {
        if (!m || m.r < 0 || m.c < 0 || m.rs <= 0 || m.cs <= 0) continue
        try {
          worksheet.mergeCells(m.r + 1, m.c + 1, m.r + m.rs, m.c + m.cs)
        } catch {
          // 容错防止重叠合并抛出异常中断整个导出
        }
      }
    }

    // 5. 边框渲染
    if (config?.borders && Array.isArray(config.borders)) {
      for (const b of config.borders) {
        if (!b) continue
        const cell = worksheet.getCell(b.row_index + 1, b.col_index + 1)
        const borders: Partial<ExcelJS.Borders> = {}
        if (b.l) borders.left = mapBorderSegment(b.l)
        if (b.r) borders.right = mapBorderSegment(b.r)
        if (b.t) borders.top = mapBorderSegment(b.t)
        if (b.b) borders.bottom = mapBorderSegment(b.b)
        cell.border = { ...cell.border, ...borders }
      }
    }

    // 6. 冻结窗格
    if (config?.freeze && (config.freeze.xSplit > 0 || config.freeze.ySplit > 0)) {
      worksheet.views = [
        {
          state: 'frozen',
          xSplit: config.freeze.xSplit,
          ySplit: config.freeze.ySplit,
        },
      ]
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Uint8Array(buffer)
}

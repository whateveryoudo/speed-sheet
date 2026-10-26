import { describe, it, expect } from 'vitest'
import type { WorkbookSnapshot } from '@speed-sheet/shared'
import {
  exportSnapshotToSpeedSheet,
  importSpeedSheetToSnapshot,
} from '../speedsheet'
import { exportSnapshotToXlsx } from '../xlsx/export'
import { importXlsxToSnapshot } from '../xlsx/import'
import { exportSnapshotToCsv } from '../csv/export'
import { importCsvToSnapshot } from '../csv/import'

function createSampleSnapshot(): WorkbookSnapshot {
  const rowOrder = ['r_1', 'r_2', 'r_3']
  const colOrder = ['c_1', 'c_2', 'c_3']

  return {
    version: 2,
    activeSheetId: 'sheet_01',
    sheets: [
      {
        id: 'sheet_01',
        name: '测试销售表',
        order: 0,
        rowOrder,
        colOrder,
        cells: {
          'r_1:c_1': { v: '产品', bl: 1, fc: '#1890ff', bg: '#f0f5ff' },
          'r_1:c_2': { v: '销量', bl: 1 },
          'r_1:c_3': { v: '单价', bl: 1 },
          'r_2:c_1': { v: '苹果' },
          'r_2:c_2': { v: 100 },
          'r_2:c_3': { v: 5.5 },
          'r_3:c_1': { v: '总计' },
          'r_3:c_2': { v: 100, f: '=SUM(B2:B2)' },
          'r_3:c_3': { v: null },
        },
        config: {
          merges: {
            '2_0': { r: 2, c: 0, rs: 1, cs: 1 },
          },
          rowHeight: { '0': 32, '1': 24 },
          colWidth: { '0': 120, '1': 80 },
          rowHidden: {},
          colHidden: {},
          borders: [],
          filters: [],
        },
      },
    ],
  }
}

describe('SpeedSheet native import/export', () => {
  it('should losslessly export and import .speedsheet format', () => {
    const original = createSampleSnapshot()
    const serialized = exportSnapshotToSpeedSheet(original, { title: '测试文档' })

    expect(serialized).toContain('"magic":"SPEED_SHEET"')
    expect(serialized).toContain('测试销售表')

    const imported = importSpeedSheetToSnapshot(serialized)
    expect(imported.sheets.length).toBe(1)
    expect(imported.sheets[0].name).toBe('测试销售表')
    expect(imported.sheets[0].cells['r_1:c_1'].v).toBe('产品')
    expect(imported.sheets[0].cells['r_1:c_1'].bl).toBe(1)
    expect(imported.sheets[0].cells['r_1:c_1'].fc).toBe('#1890ff')
    expect(imported.sheets[0].cells['r_3:c_2'].f).toBe('=SUM(B2:B2)')
  })
})

describe('CSV import/export', () => {
  it('should export valid CSV string with BOM and import it back', () => {
    const snapshot = createSampleSnapshot()
    const csv = exportSnapshotToCsv(snapshot)

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('产品,销量,单价')
    expect(csv).toContain('苹果,100,5.5')

    const imported = importCsvToSnapshot(csv, { sheetName: '导入的CSV表' })
    expect(imported.sheets.length).toBe(1)
    expect(imported.sheets[0].name).toBe('导入的CSV表')

    const r1 = imported.sheets[0].rowOrder[0]
    const c1 = imported.sheets[0].colOrder[0]
    const c2 = imported.sheets[0].colOrder[1]
    const cell1 = imported.sheets[0].cells[`${r1}:${c1}`]
    const cell2 = imported.sheets[0].cells[`${r1}:${c2}`]

    expect(cell1?.v).toBe('产品')
    expect(cell2?.v).toBe('销量')

    // 检查第二行苹果、销量 100 自动推导为数值
    const r2 = imported.sheets[0].rowOrder[1]
    const numCell = imported.sheets[0].cells[`${r2}:${c2}`]
    expect(numCell?.v).toBe(100)
    expect(typeof numCell?.v).toBe('number')
  })
})

describe('Excel (.xlsx) import/export via exceljs', () => {
  it('should roundtrip export to xlsx and import back to snapshot', async () => {
    const snapshot = createSampleSnapshot()
    const buffer = await exportSnapshotToXlsx(snapshot)

    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)

    const imported = await importXlsxToSnapshot(buffer)
    expect(imported.sheets.length).toBe(1)
    expect(imported.sheets[0].name).toBe('测试销售表')

    // 检查第 1 行单元格数据
    const r1 = imported.sheets[0].rowOrder[0]
    const c1 = imported.sheets[0].colOrder[0]
    const c2 = imported.sheets[0].colOrder[1]
    const cell1 = imported.sheets[0].cells[`${r1}:${c1}`]
    const cell2 = imported.sheets[0].cells[`${r1}:${c2}`]

    expect(cell1?.v).toBe('产品')
    expect(cell1?.bl).toBe(1)
    expect(cell2?.v).toBe('销量')

    // 检查数值与公式
    const r3 = imported.sheets[0].rowOrder[2]
    const formulaCell = imported.sheets[0].cells[`${r3}:${c2}`]
    expect(formulaCell?.f).toBe('=SUM(B2:B2)')
  })

  it('should export formulas with internal ref tokens and math formulas to standard A1 Excel formulas', async () => {
    const snapshot = createSampleSnapshot()
    snapshot.sheets[0].cells['r_3:c_2'].f = '=SUM(#r_2:c_2~r_2:c_2#)'
    snapshot.sheets[0].cells['r_3:c_3'] = { v: 200, f: '=ABS(-200)' }

    const buffer = await exportSnapshotToXlsx(snapshot)
    const imported = await importXlsxToSnapshot(buffer)

    const r3 = imported.sheets[0].rowOrder[2]
    const c2 = imported.sheets[0].colOrder[1]
    const c3 = imported.sheets[0].colOrder[2]

    expect(imported.sheets[0].cells[`${r3}:${c2}`]?.f).toBe('=SUM(B2:B2)')
    expect(imported.sheets[0].cells[`${r3}:${c3}`]?.f).toBe('=ABS(-200)')
  })
})

import { describe, expect, it } from 'vitest'
import { evaluateFormulaString } from '../evaluate'
import type { FormulaContext } from '../context'

/** Test-only ids: r_t0 / c_t0 — same shape as production r_<nanoid> */
function testRowId(r: number): string {
  return `r_t${r}`
}
function testColId(c: number): string {
  return `c_t${c}`
}

function mockCtx(cells: Record<string, number | string>): FormulaContext {
  const activeSheetId = '0'

  const idsToDisplay = (sheetId: string, rowId: string, colId: string) => {
    if (sheetId !== activeSheetId && sheetId !== '1') return null
    const rm = /^r_t(\d+)$/.exec(rowId)
    const cm = /^c_t(\d+)$/.exec(colId)
    if (!rm || !cm) return null
    return { r: Number(rm[1]), c: Number(cm[1]) }
  }

  return {
    activeSheetId,
    resolveSheetId: (name) => {
      if (!name) return activeSheetId
      if (name === 'SheetA' || name === '0') return '0'
      if (name === 'SheetB' || name === '1') return '1'
      return null
    },
    getSheetName: (id) => (id === '0' ? 'SheetA' : 'SheetB'),
    resolveCellIds: (sheetId, r, c) => {
      if (sheetId !== '0' && sheetId !== '1') return null
      return { rowId: testRowId(r), colId: testColId(c) }
    },
    idsToDisplay,
    expandIdRange: (sheetId, rowId0, colId0, rowId1, colId1) => {
      const a = idsToDisplay(sheetId, rowId0, colId0)
      const b = idsToDisplay(sheetId, rowId1, colId1)
      if (!a || !b) return []
      const out: Array<{ rowId: string; colId: string }> = []
      for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) {
        for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) {
          out.push({ rowId: testRowId(r), colId: testColId(c) })
        }
      }
      return out
    },
    getScalarById: (sheetId, rowId, colId) => {
      const key = `${sheetId}:${rowId}:${colId}`
      return cells[key] ?? null
    },
    getScalar: (sheetId, r, c) => {
      const key = `${sheetId}:${testRowId(r)}:${testColId(c)}`
      return cells[key] ?? null
    },
  }
}

describe('evaluateFormulaString', () => {
  it('evaluates arithmetic', () => {
    const r = evaluateFormulaString('=1+2*3', mockCtx({}))
    expect(r.value).toBe(7)
    expect(r.m).toBe('7')
  })

  it('evaluates internal cell refs', () => {
    const ctx = mockCtx({
      '0:r_t0:c_t0': 10,
      '0:r_t0:c_t1': 5,
    })
    const r = evaluateFormulaString('=#r_t0:c_t0#+#r_t0:c_t1#', ctx)
    expect(r.value).toBe(15)
  })

  it('evaluates SUM internal range', () => {
    const ctx = mockCtx({
      '0:r_t0:c_t0': 1,
      '0:r_t1:c_t0': 2,
      '0:r_t2:c_t0': 3,
    })
    const r = evaluateFormulaString('=SUM(#r_t0:c_t0~r_t2:c_t0#)', ctx)
    expect(r.value).toBe(6)
  })

  it('evaluates cross-sheet internal ref', () => {
    const ctx = mockCtx({ '1:r_t12:c_t3': 20 })
    const r = evaluateFormulaString('=SUM(#@1|r_t12:c_t3#)', ctx)
    expect(r.value).toBe(20)
  })
})

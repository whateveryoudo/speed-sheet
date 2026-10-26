import { describe, expect, it } from 'vitest'
import { evaluateFormulaString } from '../evaluate'
import { displayFormulaToInternal, internalFormulaToDisplay } from '../formula-bindings'
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

  it('evaluates ABS with negative number', () => {
    const r = evaluateFormulaString('=ABS(-200)', mockCtx({}))
    expect(r.value).toBe(200)
    expect(r.m).toBe('200')
  })

  it('evaluates ROUND with 2 args', () => {
    const r = evaluateFormulaString('=ROUND(3.14159, 2)', mockCtx({}))
    expect(r.value).toBe(3.14)
    expect(r.m).toBe('3.14')
  })

  it('evaluates full-width Chinese characters', () => {
    const r1 = evaluateFormulaString('=ABS（－200）', mockCtx({}))
    expect(r1.value).toBe(200)
    const r2 = evaluateFormulaString('＝SUM(10，20)', mockCtx({}))
    expect(r2.value).toBe(30)
  })

  it('evaluates nested functions and expressions in args', () => {
    const r1 = evaluateFormulaString('=SUM(ABS(-10), ROUND(3.1415, 1))', mockCtx({}))
    expect(r1.value).toBe(13.1)
    const r2 = evaluateFormulaString('=ABS(10 - 30)', mockCtx({}))
    expect(r2.value).toBe(20)
  })

  it('evaluates end-to-end complex cross-sheet formulas with ranges and arithmetic', () => {
    // Sheet 0 (SheetA): A1=10, B1=-5
    // Sheet 1 (SheetB): A1=20, A2=30, B1=40, B2=50
    const ctx = mockCtx({
      '0:r_t0:c_t0': 10,
      '0:r_t0:c_t1': -5,
      '1:r_t0:c_t0': 20,
      '1:r_t1:c_t0': 30,
      '1:r_t0:c_t1': 40,
      '1:r_t1:c_t1': 50,
    })

    // 1. 跨表区域求和 + 本地单元格加权运算
    const input1 = "=SUM('SheetB'!A1:B2) + SheetA!A1 * 2"
    const internal1 = displayFormulaToInternal(input1, ctx, '0')
    const r1 = evaluateFormulaString(internal1, ctx)
    // SheetB A1:B2 sum = 20+30+40+50 = 140. SheetA A1*2 = 20. Total = 160.
    expect(r1.value).toBe(160)

    // 2. 跨表单元格混合算术表达式作为函数参数
    const input2 = "=ROUND('SheetB'!A1 * 1.555, 2)"
    const internal2 = displayFormulaToInternal(input2, ctx, '0')
    const r2 = evaluateFormulaString(internal2, ctx)
    // 20 * 1.555 = 31.1
    expect(r2.value).toBe(31.1)

    // 3. 负数单元格减法运算 (保证不产生 10--5 JS 语法错误)
    const input3 = '=A1 - B1'
    const internal3 = displayFormulaToInternal(input3, ctx, '0')
    const r3 = evaluateFormulaString(internal3, ctx)
    // 10 - (-5) = 15
    expect(r3.value).toBe(15)

    // 4. 复杂嵌套函数：ROUND(SUM('SheetB'!A1:A2) / ABS(-4), 1) + 10
    const input4 = "=ROUND(SUM('SheetB'!A1:A2) / ABS(-4), 1) + 10"
    const internal4 = displayFormulaToInternal(input4, ctx, '0')
    const r4 = evaluateFormulaString(internal4, ctx)
    // SUM(20, 30) = 50. 50 / 4 = 12.5. ROUND(12.5, 1) = 12.5. 12.5 + 10 = 22.5
    expect(r4.value).toBe(22.5)

    // 5. 跨表逻辑判断 IF 函数
    const input5 = '=IF(\'SheetB\'!A1 >= 20, "PASS, (OK)", "FAIL, (NOT OK)")'
    const internal5 = displayFormulaToInternal(input5, ctx, '0')
    const r5 = evaluateFormulaString(internal5, ctx)
    expect(r5.value).toBe('PASS, (OK)')

    // 6. 还原回展示用 A1 公式
    const displayBack = internalFormulaToDisplay(internal1, ctx, '0')
    expect(displayBack).toContain("'SheetB'!A1:B2")
  })
})

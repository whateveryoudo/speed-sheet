import { describe, expect, it } from 'vitest'
import { evaluateFormulaString } from '../evaluate'
import type { FormulaContext } from '../context'

function mockCtx(cells: Record<string, number | string>): FormulaContext {
  const activeSheetId = '0'
  return {
    activeSheetId,
    resolveSheetId: (name) => {
      if (!name) return activeSheetId
      if (name === 'SheetA' || name === '0') return '0'
      if (name === 'SheetB' || name === '1') return '1'
      return null
    },
    getSheetName: (id) => (id === '0' ? 'SheetA' : 'SheetB'),
    getScalar: (sheetId, r, c) => {
      const key = `${sheetId}:R${r}_C${c}`
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

  it('evaluates A1+B1', () => {
    const ctx = mockCtx({ '0:R0_C0': 10, '0:R0_C1': 5 })
    const r = evaluateFormulaString('=A1+B1', ctx)
    expect(r.value).toBe(15)
  })

  it('evaluates SUM range', () => {
    const ctx = mockCtx({
      '0:R0_C0': 1,
      '0:R1_C0': 2,
      '0:R2_C0': 3,
    })
    const r = evaluateFormulaString('=SUM(A1:A3)', ctx)
    expect(r.value).toBe(6)
  })

  it('evaluates cross-sheet ref', () => {
    const ctx = mockCtx({ '1:R12_C3': 20 })
    const r = evaluateFormulaString('=SUM(SheetB!D13)', ctx)
    expect(r.value).toBe(20)
  })
})

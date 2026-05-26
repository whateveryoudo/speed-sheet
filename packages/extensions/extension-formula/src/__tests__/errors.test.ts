import { describe, expect, it } from 'vitest'
import { evaluateFormulaString } from '../evaluate'
import type { FormulaContext } from '../context'

function mockCtx(cells: Record<string, number | string> = {}): FormulaContext {
  const activeSheetId = '0'
  return {
    activeSheetId,
    resolveSheetId: (name) => {
      if (!name) return activeSheetId
      if (name === 'Missing') return null
      return '0'
    },
    getSheetName: () => 'Sheet1',
    getScalar: (sheetId, r, c) => cells[`${sheetId}:R${r}_C${c}`] ?? null,
  }
}

describe('formula errors', () => {
  it('returns #ERROR! for parse failure', () => {
    const r = evaluateFormulaString('=1+', mockCtx())
    expect(r.m).toBe('#ERROR!')
    expect(r.error).toBe('ERROR')
    expect(r.errorMessage).toContain('解析')
  })

  it('returns #NAME? for unknown function', () => {
    const r = evaluateFormulaString('=SAM(A1)', mockCtx({ '0:R0_C0': 1 }))
    expect(r.m).toBe('#NAME?')
    expect(r.error).toBe('NAME')
  })

  it('returns #VALUE! for text in arithmetic', () => {
    const r = evaluateFormulaString('=1+"a"', mockCtx())
    expect(r.m).toBe('#VALUE!')
    expect(r.error).toBe('VALUE')
  })

  it('returns #DIV/0! for divide by zero', () => {
    const r = evaluateFormulaString('=1/0', mockCtx())
    expect(r.m).toBe('#DIV/0!')
    expect(r.error).toBe('DIV0')
  })

  it('returns #REF! for missing sheet', () => {
    const r = evaluateFormulaString('=Missing!A1', mockCtx())
    expect(r.m).toBe('#REF!')
    expect(r.error).toBe('REF')
  })

  it('returns #NULL! for space between ranges', () => {
    const r = evaluateFormulaString('=SUM(A1:A4 B1:B4)', mockCtx())
    expect(r.m).toBe('#NULL!')
    expect(r.error).toBe('NULL')
  })
})

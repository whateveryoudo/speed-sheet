import { describe, expect, it } from 'vitest'
import { canPickFormulaRef, canPickFormulaRefAtCaret, patchFormulaWithRef } from '../edit'

describe('canPickFormulaRefAtCaret', () => {
  it('allows after =', () => {
    expect(canPickFormulaRefAtCaret('=', 1)).toBe(true)
  })

  it('allows after operator', () => {
    expect(canPickFormulaRefAtCaret('=A1+', 5)).toBe(true)
    expect(canPickFormulaRefAtCaret('=SUM(A1,', 8)).toBe(true)
    expect(canPickFormulaRefAtCaret('=IF(A1>', 7)).toBe(true)
  })

  it('disallows after complete ref', () => {
    expect(canPickFormulaRefAtCaret('=A1+B1', 6)).toBe(false)
    expect(canPickFormulaRefAtCaret('=A1', 3)).toBe(false)
  })

  it('session flag enables pick without operator', () => {
    expect(canPickFormulaRef('=A1+B1', 6, true)).toBe(true)
    expect(canPickFormulaRef('=A1+B1', 6, false)).toBe(false)
  })
})

describe('patchFormulaWithRef', () => {
  it('appends after operator', () => {
    const { text, caret } = patchFormulaWithRef('=A1+', 5, 'B2')
    expect(text).toBe('=A1+B2')
    expect(caret).toBe(6)
  })

  it('replaces ref under caret', () => {
    const { text } = patchFormulaWithRef('=A1+C1', 3, 'B2')
    expect(text).toBe('=B2+C1')
  })

  it('replaces range token', () => {
    const { text } = patchFormulaWithRef('=SUM(A1:B2)', 8, 'D3:G3')
    expect(text).toBe('=SUM(D3:G3)')
  })
})

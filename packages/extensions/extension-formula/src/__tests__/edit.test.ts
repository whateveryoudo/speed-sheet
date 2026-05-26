import { describe, expect, it } from 'vitest'
import { patchFormulaWithRef } from '../edit'

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

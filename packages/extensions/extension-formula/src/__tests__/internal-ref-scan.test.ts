import { describe, expect, it } from 'vitest'
import { extractInternalRefTokens } from '../internal-ref-scan'
import { extractRefTokens } from '../refs'
import { getFormulaRefSpans } from '../refSpans'

describe('internal ref scan', () => {
  it('does not treat A1 substrings inside nanoid refs as A1', () => {
    const f =
      '=#r_CArRIba0RJEr:c_q18bcllVzsxB#+#r_MGgYYih70X1G:c_A4bcllVzsxB#'
    expect(extractRefTokens(f)).toEqual([])
    expect(extractInternalRefTokens(f)).toHaveLength(2)
    const spans = getFormulaRefSpans(f)
    expect(spans).toHaveLength(2)
    expect(spans.every((s) => f.slice(s.start, s.end).startsWith('#'))).toBe(true)
  })
})

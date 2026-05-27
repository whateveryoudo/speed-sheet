import { extractInternalRefTokens, hasInternalRefs } from './internal-ref-scan'
import { extractRefTokens } from './refs'

export const FORMULA_REF_COLORS = [
  '#1a73e8',
  '#0d9d57',
  '#e37400',
  '#9c27b0',
  '#d93025',
] as const

export interface FormulaRefSpan {
  start: number
  end: number
  token: string
  color: string
}

function spansForTokens(formula: string, tokens: string[]): FormulaRefSpan[] {
  const spans: FormulaRefSpan[] = []
  let searchFrom = 0
  tokens.forEach((token, i) => {
    const idx = formula.indexOf(token, searchFrom)
    if (idx < 0) return
    spans.push({
      start: idx,
      end: idx + token.length,
      token,
      color: FORMULA_REF_COLORS[i % FORMULA_REF_COLORS.length],
    })
    searchFrom = idx + token.length
  })
  return spans
}

/** 公式内引用 token 着色区间 */
export function getFormulaRefSpans(formula: string): FormulaRefSpan[] {
  if (hasInternalRefs(formula)) {
    return spansForTokens(formula, extractInternalRefTokens(formula))
  }
  return spansForTokens(formula, extractRefTokens(formula))
}

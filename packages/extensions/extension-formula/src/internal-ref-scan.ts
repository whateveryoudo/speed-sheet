import { AXIS_ID_PATTERN } from '@speed-sheet/shared'

const ID = AXIS_ID_PATTERN
const INTERNAL_REF_FULL_RE = new RegExp(
  `#(?:@[^|#]+\\|)?${ID}:${ID}(?:~${ID}:${ID})?#`,
  'g',
)

/** Ranges of `#r_…:c_…#` tokens — A1 scanners must not match inside these. */
export function getInternalRefRanges(formula: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = []
  INTERNAL_REF_FULL_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INTERNAL_REF_FULL_RE.exec(formula)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length })
  }
  return ranges
}

export function overlapsInternalRef(formula: string, start: number, end: number): boolean {
  for (const r of getInternalRefRanges(formula)) {
    if (start < r.end && end > r.start) return true
  }
  return false
}

export function hasInternalRefs(formula: string): boolean {
  INTERNAL_REF_FULL_RE.lastIndex = 0
  return INTERNAL_REF_FULL_RE.test(formula)
}

export function extractInternalRefTokens(formula: string): string[] {
  const tokens: string[] = []
  INTERNAL_REF_FULL_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = INTERNAL_REF_FULL_RE.exec(formula)) !== null) {
    tokens.push(m[0])
  }
  return tokens
}

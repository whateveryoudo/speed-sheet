import type { FormulaContext } from './context'
import { collectRangeScalars, coerceNumber } from './context'
import { formulaErrorResult, type FormulaErrorCode } from './errors'
import { FN_MAP, FN_RE } from './fnMap'
import { isRegisteredBuiltin } from './registry'
import { extractRefTokens, parseRefToken } from './refs'

export type { FormulaErrorCode }
export { formulaErrorResult, isFormulaErrorDisplay, getFormulaErrorMessage, FORMULA_ERRORS } from './errors'

export interface FormulaResult {
  value: number | string | boolean | null
  m: string
  error?: FormulaErrorCode
  errorMessage?: string
}

type FnName = keyof typeof FN_MAP
const IDENT_FN_RE = /\b([A-Za-z_][\w.]*)\s*\(/g
const NULL_RANGE_RE = /[A-Za-z]{1,4}\d+:[A-Za-z]{1,4}\d+\s+[A-Za-z]{1,4}/

function splitTopLevelArgs(inner: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(inner.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(inner.slice(start).trim())
  return parts.filter(Boolean)
}

function detectNameError(expr: string): boolean {
  IDENT_FN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = IDENT_FN_RE.exec(expr)) !== null) {
    const name = m[1].toUpperCase().replace(/\./g, '')
    if (!isRegisteredBuiltin(name)) return true
  }
  return false
}

function detectNullRangeError(expr: string): boolean {
  return NULL_RANGE_RE.test(expr)
}

function resolveSheetForRef(
  ctx: FormulaContext,
  sheetName: string | undefined,
): string | { error: 'REF' } {
  if (sheetName) {
    const id = ctx.resolveSheetId(sheetName)
    if (!id) return { error: 'REF' }
    return id
  }
  return ctx.activeSheetId
}

function resolveArgNumbers(
  arg: string,
  ctx: FormulaContext,
  visiting: Set<string>,
): number[] | { error: FormulaErrorCode } {
  const ref = parseRefToken(arg)
  if (ref?.range) {
    const sheetResolved = resolveSheetForRef(ctx, ref.sheet)
    if (typeof sheetResolved !== 'string') return sheetResolved
    const sheetId = sheetResolved
    return collectRangeScalars(ctx, sheetId, ref.range.row, ref.range.column, visiting)
  }
  if (ref?.cell) {
    const sheetResolved = resolveSheetForRef(ctx, ref.sheet)
    if (typeof sheetResolved !== 'string') return sheetResolved
    const sheetId = sheetResolved
    const raw = ctx.getScalar(sheetId, ref.cell.r, ref.cell.c, visiting)
    if (typeof raw === 'string' && raw.startsWith('#')) return { error: 'REF' }
    if (typeof raw === 'string' && raw !== '' && Number.isNaN(Number(raw))) {
      return { error: 'VALUE' }
    }
    return [coerceNumber(raw)]
  }
  const n = Number(arg)
  if (Number.isFinite(n)) return [n]
  if (arg.startsWith('"') || /[A-Za-z\u4e00-\u9fff]/.test(arg)) return { error: 'VALUE' }
  return []
}

function evalFunctions(
  expr: string,
  ctx: FormulaContext,
  visiting: Set<string>,
): string | { error: FormulaErrorCode } {
  let out = expr
  let guard = 0
  while (guard++ < 32) {
    FN_RE.lastIndex = 0
    const m = FN_RE.exec(out)
    if (!m) break
    const fnName = m[1].toUpperCase().replace(/\./g, '') as FnName
    const fn = FN_MAP[fnName]
    if (!fn) {
      FN_RE.lastIndex = m.index + m[0].length
      continue
    }

    const open = m.index + m[0].length
    let depth = 1
    let i = open
    for (; i < out.length && depth > 0; i++) {
      if (out[i] === '(') depth++
      else if (out[i] === ')') depth--
    }
    if (depth !== 0) return { error: 'ERROR' }

    const inner = out.slice(open, i - 1)
    const args = splitTopLevelArgs(inner)
    const values: number[] = []
    for (const a of args) {
      const resolved = resolveArgNumbers(a, ctx, visiting)
      if (!Array.isArray(resolved)) return resolved
      values.push(...resolved)
    }

    let computed: number
    computed = fn(values)

    if (!Number.isFinite(computed)) return { error: 'NUM' }

    const replacement = String(computed)
    out = out.slice(0, m.index) + replacement + out.slice(i)
  }
  return out
}

function replaceRefs(
  expr: string,
  ctx: FormulaContext,
  visiting: Set<string>,
): string | { error: FormulaErrorCode } {
  const tokens = extractRefTokens(expr)
  let out = expr
  for (const token of tokens) {
    const ref = parseRefToken(token)
    if (!ref) continue
    const sheetResolved = resolveSheetForRef(ctx, ref.sheet)
    if (typeof sheetResolved !== 'string') return sheetResolved
    const sheetId = sheetResolved
    if (ref.range) {
      const nums = collectRangeScalars(ctx, sheetId, ref.range.row, ref.range.column, visiting)
      const sumFn = FN_MAP.SUM
      if (!sumFn) return { error: 'NAME' }
      const sum = sumFn(nums)
      if (!Number.isFinite(sum)) return { error: 'NUM' }
      out = out.split(token).join(String(sum))
      continue
    }
    if (ref.cell) {
      const raw = ctx.getScalar(sheetId, ref.cell.r, ref.cell.c, visiting)
      if (typeof raw === 'string' && raw.startsWith('#')) return { error: 'REF' }
      if (typeof raw === 'string' && raw !== '' && Number.isNaN(Number(raw))) {
        return { error: 'VALUE' }
      }
      const v = coerceNumber(raw)
      out = out.split(token).join(String(v))
    }
  }
  return out
}

function safeArithmetic(expr: string): FormulaResult {
  const trimmed = expr.replace(/\s/g, '')
  if (!trimmed) return formulaErrorResult('ERROR')

  if (/[a-zA-Z"]/.test(trimmed)) {
    return formulaErrorResult('VALUE')
  }

  if (!/^[0-9+\-*/().]+$/.test(trimmed)) {
    return formulaErrorResult('ERROR')
  }

  if (/\/\s*0+(?:\.0*)?(?:[+\-*/)]|$)/.test(trimmed)) {
    return formulaErrorResult('DIV0')
  }

  try {
    // eslint-disable-next-line no-new-func
    const v = new Function(`return (${trimmed})`)()
    if (typeof v !== 'number' || Number.isNaN(v)) {
      return formulaErrorResult('VALUE')
    }
    if (!Number.isFinite(v)) {
      return formulaErrorResult(Math.abs(v) === Infinity ? 'DIV0' : 'NUM')
    }
    const m = Number.isInteger(v) ? String(v) : String(Math.round(v * 1e9) / 1e9)
    return { value: v, m }
  } catch {
    return formulaErrorResult('ERROR')
  }
}

export function evaluateFormulaString(
  raw: string,
  ctx: FormulaContext,
  visiting: Set<string> = new Set(),
): FormulaResult {
  const text = raw.trim()
  if (!text.startsWith('=')) {
    return { value: text, m: text }
  }

  let expr = text.slice(1).trim()
  if (!expr) {
    return formulaErrorResult('ERROR')
  }

  if (detectNullRangeError(expr)) {
    return formulaErrorResult('NULL')
  }

  if (detectNameError(expr)) {
    return formulaErrorResult('NAME')
  }

  try {
    const afterFn = evalFunctions(expr, ctx, visiting)
    if (typeof afterFn !== 'string') {
      return formulaErrorResult(afterFn.error)
    }
    expr = afterFn

    const afterRefs = replaceRefs(expr, ctx, visiting)
    if (typeof afterRefs !== 'string') {
      return formulaErrorResult(afterRefs.error)
    }
    expr = afterRefs

    return safeArithmetic(expr)
  } catch {
    return formulaErrorResult('ERROR')
  }
}

export { isFormulaInput } from './edit'

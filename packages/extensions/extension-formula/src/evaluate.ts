import type { FormulaContext } from './context'
import { collectIdRangeScalars, coerceNumber } from './context'
import { formulaErrorResult, type FormulaErrorCode } from './errors'
import {
  extractInternalRefTokens,
  hasInternalRefs,
  parseInternalRefToken,
} from './formula-bindings'
import { normalizeFormulaInput } from './refs'
import { FN_MAP, FN_RE } from './fnMap'
import { isRegisteredBuiltin } from './registry'

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
  let inQuote = false
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '"' && (i === 0 || inner[i - 1] !== '\\')) {
      inQuote = !inQuote
    } else if (!inQuote) {
      if (ch === '(') depth++
      else if (ch === ')') depth--
      else if (ch === ',' && depth === 0) {
        parts.push(inner.slice(start, i).trim())
        start = i + 1
      }
    }
  }
  parts.push(inner.slice(start).trim())
  return parts.filter((p) => p.length > 0)
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

function resolveRefSheetId(
  ctx: FormulaContext,
  sheetIdOrName: string | undefined,
): string | { error: 'REF' } {
  if (!sheetIdOrName) return ctx.activeSheetId
  const id = ctx.resolveSheetId(sheetIdOrName)
  if (!id) return { error: 'REF' }
  return id
}

function resolveArg(
  arg: string,
  ctx: FormulaContext,
  visiting: Set<string>,
): any | { error: FormulaErrorCode } {
  let trimmed = arg.trim()
  if (!trimmed) return 0

  // 1. 单个内部引用 token（单元格或区域）
  if (trimmed.startsWith('#') && trimmed.endsWith('#')) {
    const ref = parseInternalRefToken(trimmed)
    if (ref) {
      const sheetResolved = resolveRefSheetId(ctx, ref.sheetId)
      if (typeof sheetResolved !== 'string') return sheetResolved
      const sheetId = sheetResolved
      if (ref.endRowId != null && ref.endColId != null) {
        return collectIdRangeScalars(
          ctx,
          sheetId,
          ref.rowId,
          ref.colId,
          ref.endRowId,
          ref.endColId,
          visiting,
        )
      }
      const raw = ctx.getScalarById(sheetId, ref.rowId, ref.colId, visiting)
      if (typeof raw === 'string' && raw.startsWith('#')) return { error: 'REF' }
      if (typeof raw === 'string' && raw !== '' && Number.isNaN(Number(raw))) {
        return raw
      }
      return coerceNumber(raw)
    }
  }

  // 2. 内部引用与表达式混合（如 #r_0:c_0# * 1.5 或 #r_0:c_0# > 10）
  if (hasInternalRefs(trimmed)) {
    const afterRefs = replaceInternalRefs(trimmed, ctx, visiting)
    if (typeof afterRefs !== 'string') return afterRefs
    trimmed = afterRefs
  }

  if (trimmed.toUpperCase() === 'TRUE') return true
  if (trimmed.toUpperCase() === 'FALSE') return false
  if (/^"[^"]*"$/.test(trimmed)) return trimmed.slice(1, -1)

  const n = Number(trimmed)
  if (Number.isFinite(n)) return n

  // 3. 计算表达式（算术或逻辑比较）
  const res = safeArithmetic(trimmed)
  if (!res.error) {
    return res.value
  }

  if (/[A-Za-z\u4e00-\u9fff]/.test(trimmed)) return { error: 'VALUE' }
  return trimmed
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
    let inQuote = false
    for (; i < out.length && depth > 0; i++) {
      const ch = out[i]
      if (ch === '"' && (i === 0 || out[i - 1] !== '\\')) {
        inQuote = !inQuote
      } else if (!inQuote) {
        if (ch === '(') depth++
        else if (ch === ')') depth--
      }
    }
    if (depth !== 0) return { error: 'ERROR' }

    let inner = out.slice(open, i - 1)
    if (FN_RE.test(inner)) {
      const evaluatedInner = evalFunctions(inner, ctx, visiting)
      if (typeof evaluatedInner !== 'string') return evaluatedInner
      inner = evaluatedInner
    }

    const args = splitTopLevelArgs(inner)
    const callArgs: any[] = []
    for (const a of args) {
      const resolved = resolveArg(a, ctx, visiting)
      if (typeof resolved === 'object' && resolved !== null && 'error' in resolved) {
        return resolved
      }
      callArgs.push(resolved)
    }

    let computed: any
    try {
      computed = (fn as any)(...callArgs)
    } catch {
      return { error: 'VALUE' }
    }

    if (computed instanceof Error) {
      const msg = computed.message.replace(/^#|!$/g, '').toUpperCase()
      if (msg === 'VALUE') return { error: 'VALUE' }
      if (msg === 'DIV/0' || msg === 'DIV0') return { error: 'DIV0' }
      if (msg === 'NUM') return { error: 'NUM' }
      if (msg === 'REF') return { error: 'REF' }
      if (msg === 'NAME') return { error: 'NAME' }
      if (msg === 'NULL') return { error: 'NULL' }
      if (msg === 'NA' || msg === 'N/A') return { error: 'NA' }
      return { error: 'ERROR' }
    }

    let replacement: string
    if (typeof computed === 'number') {
      if (!Number.isFinite(computed)) return { error: 'NUM' }
      replacement = String(computed)
    } else if (typeof computed === 'boolean') {
      replacement = computed ? 'TRUE' : 'FALSE'
    } else if (typeof computed === 'string') {
      replacement = JSON.stringify(computed)
    } else {
      replacement = String(computed ?? '')
    }

    out = out.slice(0, m.index) + replacement + out.slice(i)
  }
  return out
}

function replaceInternalRefs(
  expr: string,
  ctx: FormulaContext,
  visiting: Set<string>,
): string | { error: FormulaErrorCode } {
  const tokens = extractInternalRefTokens(expr)
  let out = expr
  for (const token of tokens) {
    const ref = parseInternalRefToken(token)
    if (!ref) continue
    const sheetResolved = resolveRefSheetId(ctx, ref.sheetId)
    if (typeof sheetResolved !== 'string') return sheetResolved
    const sheetId = sheetResolved
    if (ref.endRowId != null && ref.endColId != null) {
      const nums = collectIdRangeScalars(
        ctx,
        sheetId,
        ref.rowId,
        ref.colId,
        ref.endRowId,
        ref.endColId,
        visiting,
      )
      const sumFn = FN_MAP.SUM
      if (!sumFn) return { error: 'NAME' }
      const sum = sumFn(nums)
      if (!Number.isFinite(sum)) return { error: 'NUM' }
      const rep = sum < 0 ? `(${sum})` : String(sum)
      out = out.split(token).join(rep)
      continue
    }
    const raw = ctx.getScalarById(sheetId, ref.rowId, ref.colId, visiting)
    if (typeof raw === 'string' && raw.startsWith('#')) return { error: 'REF' }
    if (typeof raw === 'string' && raw !== '' && Number.isNaN(Number(raw))) {
      out = out.split(token).join(JSON.stringify(raw))
      continue
    }
    const v = coerceNumber(raw)
    const rep = v < 0 ? `(${v})` : String(v)
    out = out.split(token).join(rep)
  }
  return out
}

function safeArithmetic(expr: string): FormulaResult {
  const pureTrimmed = expr.trim()
  if (!pureTrimmed) return formulaErrorResult('ERROR')

  if (pureTrimmed === 'TRUE') return { value: true, m: 'TRUE' }
  if (pureTrimmed === 'FALSE') return { value: false, m: 'FALSE' }
  if (/^"[^"]*"$/.test(pureTrimmed)) {
    const s = pureTrimmed.slice(1, -1)
    return { value: s, m: s }
  }

  const trimmed = pureTrimmed.replace(/\s/g, '')

  if (/[a-zA-Z"]/.test(trimmed)) {
    return formulaErrorResult('VALUE')
  }

  // 允许数字、基础算术（+ - * / % ^）、括号、比较符（< > = !）
  if (!/^[0-9+\-*/().^%<>=!]+$/.test(trimmed)) {
    return formulaErrorResult('ERROR')
  }

  if (/\/\s*0+(?:\.0*)?(?:[+\-*/)]|$)/.test(trimmed)) {
    return formulaErrorResult('DIV0')
  }

  try {
    const jsExpr = trimmed
      .replace(/<>/g, '!==')
      .replace(/(?<![<>=!])=(?![=])/g, '===')
      .replace(/\^/g, '**')

    // eslint-disable-next-line no-new-func
    const v = new Function(`return (${jsExpr})`)()
    if (typeof v === 'boolean') {
      return { value: v, m: v ? 'TRUE' : 'FALSE' }
    }
    if (typeof v === 'string') {
      return { value: v, m: v }
    }
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
  const normalized = normalizeFormulaInput(raw)
  const text = normalized.trim()
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

    if (hasInternalRefs(expr)) {
      const afterRefs = replaceInternalRefs(expr, ctx, visiting)
      if (typeof afterRefs !== 'string') {
        return formulaErrorResult(afterRefs.error)
      }
      expr = afterRefs
    }

    return safeArithmetic(expr)
  } catch {
    return formulaErrorResult('ERROR')
  }
}

export { isFormulaInput } from './edit'

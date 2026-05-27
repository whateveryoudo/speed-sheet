/**
 * 公式编辑态字符串操作（headless，与 UI 框架无关）。
 * 供 vue3 / 其他宿主在公式栏、单元格内联编辑、点选引用时复用。
 */
import type { Sheet } from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'
import { createFormulaContext } from './context'
import { internalFormulaToDisplay } from './formula-bindings'
import { overlapsInternalRef } from './internal-ref-scan'
import { formatA1 } from './refs'

const REF_TOKEN_RE =
  /(?:'[^']+'!)?[A-Za-z]{1,4}\d+(?::[A-Za-z]{1,4}\d+)?/gi

const OP_END_RE = /[+\-*/,(]$/

export function isFormulaInput(text: string): boolean {
  return text.trimStart().startsWith('=')
}

export const isFormulaText = isFormulaInput

export function getCellFormulaInitialFromCell(
  cell: CellAttributes | null | undefined,
  sheet?: Sheet,
  sheetId?: string,
): string {
  if (cell?.f) {
    const f = String(cell.f)
    if (sheet && f.startsWith('=')) {
      const ctx = createFormulaContext(sheet)
      const sid = sheetId ?? sheet.getActiveSheetId()
      return internalFormulaToDisplay(f, ctx, sid)
    }
    return f
  }
  const raw = cell?.m ?? cell?.v
  if (typeof raw === 'string' && raw.startsWith('=')) return raw
  return '='
}

/** 进入公式编辑时的初始文本：已有公式则保留，否则为 `=` */
export function getCellFormulaInitial(sheet: Sheet, r: number, c: number): string {
  return getCellFormulaInitialFromCell(
    sheet.state.getCellData(r, c),
    sheet,
    sheet.getActiveSheetId(),
  )
}

export function formatRangeA1(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
): string {
  const ra = Math.min(r0, r1)
  const rb = Math.max(r0, r1)
  const ca = Math.min(c0, c1)
  const cb = Math.max(c0, c1)
  if (ra === rb && ca === cb) return formatA1(ra, ca)
  return `${formatA1(ra, ca)}:${formatA1(rb, cb)}`
}

export function buildSheetRefToken(
  sheet: Sheet,
  r0: number,
  c0: number,
  r1?: number,
  c1?: number,
  sheetId?: string,
): string {
  const sid = sheetId ?? sheet.getActiveSheetId()
  const activeId = sheet.getActiveSheetId()
  const local =
    r1 !== undefined && c1 !== undefined
      ? formatRangeA1(r0, c0, r1, c1)
      : formatA1(r0, c0)
  if (sid === activeId) return local
  const name = sheet.getSheetName(sid)
  return `'${name.replace(/'/g, "''")}'!${local}`
}

function findRefSpanAt(formula: string, index: number): { start: number; end: number } | null {
  REF_TOKEN_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = REF_TOKEN_RE.exec(formula)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (overlapsInternalRef(formula, start, end)) continue
    if (index >= start && index <= end) return { start, end }
  }
  return null
}

function findLastRefSpan(formula: string): { start: number; end: number } | null {
  REF_TOKEN_RE.lastIndex = 0
  let last: { start: number; end: number } | null = null
  let m: RegExpExecArray | null
  while ((m = REF_TOKEN_RE.exec(formula)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (overlapsInternalRef(formula, start, end)) continue
    last = { start, end }
  }
  return last
}

/** 在公式中插入/替换引用：运算符后拼接，否则替换光标处引用（或最后一个引用） */
export function patchFormulaWithRef(
  formula: string,
  caret: number,
  refToken: string,
): { text: string; caret: number } {
  if (!isFormulaInput(formula)) {
    return { text: `=${refToken}`, caret: 1 + refToken.length }
  }

  const safeCaret = Math.max(0, Math.min(caret, formula.length))
  const before = formula.slice(0, safeCaret)
  const after = formula.slice(safeCaret)

  if (formula === '=' || OP_END_RE.test(before.trimEnd())) {
    const text = before + refToken + after
    return { text, caret: before.length + refToken.length }
  }

  const span =
    findRefSpanAt(formula, safeCaret) ??
    findRefSpanAt(formula, safeCaret - 1) ??
    findLastRefSpan(formula)

  if (span) {
    const text = formula.slice(0, span.start) + refToken + formula.slice(span.end)
    return { text, caret: span.start + refToken.length }
  }

  const sep = OP_END_RE.test(before.trimEnd()) ? '' : '+'
  const text = before + sep + refToken + after
  return { text, caret: before.length + sep.length + refToken.length }
}

/**
 * Formula semantic bindings: stable rowId/colId in storage, A1 for display only.
 *
 * Internal cell ref:  #r_<nanoid>:c_<nanoid>#
 * Internal range:     #r_<nanoid>:c_<nanoid>~r_<nanoid>:c_<nanoid>#
 * Cross-sheet cell:   #@sheetId|r_<nanoid>:c_<nanoid>#
 */
import { AXIS_ID_PATTERN } from '@speed-sheet/shared'
import type { FormulaContext } from './context'
import {
  extractInternalRefTokens,
  hasInternalRefs,
} from './internal-ref-scan'
import { extractRefTokens, formatA1, parseRefToken, normalizeFormulaInput } from './refs'

export { extractInternalRefTokens, hasInternalRefs } from './internal-ref-scan'
export { normalizeFormulaInput } from './refs'

const ID = AXIS_ID_PATTERN

export function formatInternalCellRef(
  rowId: string,
  colId: string,
  sheetId?: string,
  rowLock = false,
  colLock = false,
): string {
  const rP = rowLock ? '$' : ''
  const cP = colLock ? '$' : ''
  if (sheetId) return `#@${sheetId}|${rP}${rowId}:${cP}${colId}#`
  return `#${rP}${rowId}:${cP}${colId}#`
}

export function formatInternalRangeRef(
  rowId0: string,
  colId0: string,
  rowId1: string,
  colId1: string,
  sheetId?: string,
  rowLock0 = false,
  colLock0 = false,
  rowLock1 = false,
  colLock1 = false,
): string {
  const rP0 = rowLock0 ? '$' : ''
  const cP0 = colLock0 ? '$' : ''
  const rP1 = rowLock1 ? '$' : ''
  const cP1 = colLock1 ? '$' : ''
  if (sheetId) return `#@${sheetId}|${rP0}${rowId0}:${cP0}${colId0}~${rP1}${rowId1}:${cP1}${colId1}#`
  return `#${rP0}${rowId0}:${cP0}${colId0}~${rP1}${rowId1}:${cP1}${colId1}#`
}

export interface InternalRef {
  sheetId?: string
  rowId: string
  colId: string
  rowLock?: boolean
  colLock?: boolean
  endRowId?: string
  endColId?: string
  endRowLock?: boolean
  endColLock?: boolean
}

export function parseInternalRefToken(token: string): InternalRef | null {
  const range = new RegExp(
    `^#(?:@([^|#]+)\\|)?(\\$?)(${ID}):(\\$?)(${ID})~(\\$?)(${ID}):(\\$?)(${ID})#$`,
  ).exec(token)
  if (range) {
    return {
      sheetId: range[1],
      rowLock: !!range[2],
      rowId: range[3]!,
      colLock: !!range[4],
      colId: range[5]!,
      endRowLock: !!range[6],
      endRowId: range[7]!,
      endColLock: !!range[8],
      endColId: range[9]!,
    }
  }
  const cell = new RegExp(`^#(?:@([^|#]+)\\|)?(\\$?)(${ID}):(\\$?)(${ID})#$`).exec(token)
  if (cell) {
    return {
      sheetId: cell[1],
      rowLock: !!cell[2],
      rowId: cell[3]!,
      colLock: !!cell[4],
      colId: cell[5]!,
    }
  }
  return null
}

function resolveIdsForA1(
  ctx: FormulaContext,
  sheetId: string,
  r: number,
  c: number,
): { rowId: string; colId: string } | null {
  return ctx.resolveCellIds(sheetId, r, c)
}

function a1RefToInternal(
  ctx: FormulaContext,
  defaultSheetId: string,
  token: string,
): string | null {
  const ref = parseRefToken(token)
  if (!ref) return null

  const sheetResolved = ref.sheet ? ctx.resolveSheetId(ref.sheet) : defaultSheetId
  if (!sheetResolved) return null

  if (ref.range) {
    const a = resolveIdsForA1(ctx, sheetResolved, ref.range.row[0], ref.range.column[0])
    const b = resolveIdsForA1(ctx, sheetResolved, ref.range.row[1], ref.range.column[1])
    if (!a || !b) return null
    const cross = sheetResolved !== defaultSheetId ? sheetResolved : undefined
    return formatInternalRangeRef(
      a.rowId,
      a.colId,
      b.rowId,
      b.colId,
      cross,
      ref.rowLock,
      ref.colLock,
      ref.endRowLock,
      ref.endColLock,
    )
  }

  if (ref.cell) {
    const ids = resolveIdsForA1(ctx, sheetResolved, ref.cell.r, ref.cell.c)
    if (!ids) return null
    const cross = sheetResolved !== defaultSheetId ? sheetResolved : undefined
    return formatInternalCellRef(ids.rowId, ids.colId, cross, ref.rowLock, ref.colLock)
  }

  return null
}

/** User-facing A1 formula → canonical internal formula (stored in `f`). */
export function displayFormulaToInternal(
  displayFormula: string,
  ctx: FormulaContext,
  defaultSheetId: string,
): string {
  const normalized = normalizeFormulaInput(displayFormula)
  const text = normalized.trim()
  if (!text.startsWith('=')) return text

  let out = text
  const tokens = [...extractRefTokens(text)].sort((a, b) => b.length - a.length)
  for (const token of tokens) {
    const internal = a1RefToInternal(ctx, defaultSheetId, token)
    if (internal) out = out.split(token).join(internal)
  }
  return out
}

function internalRefToA1(ctx: FormulaContext, ref: InternalRef, defaultSheetId: string): string | null {
  const sheetId = ref.sheetId ?? defaultSheetId

  const toA1 = (rowId: string, colId: string, rowLock = false, colLock = false): string | null => {
    const pos = ctx.idsToDisplay(sheetId, rowId, colId)
    if (!pos) return null
    return formatA1(pos.r, pos.c, rowLock, colLock)
  }

  if (ref.endRowId != null && ref.endColId != null) {
    const a = toA1(ref.rowId, ref.colId, ref.rowLock, ref.colLock)
    const b = toA1(ref.endRowId, ref.endColId, ref.endRowLock, ref.endColLock)
    if (!a || !b) return null
    const local = a === b ? a : `${a}:${b}`
    if (ref.sheetId && ref.sheetId !== defaultSheetId) {
      const name = ctx.getSheetName(ref.sheetId)
      return `'${name.replace(/'/g, "''")}'!${local}`
    }
    return local
  }

  const a = toA1(ref.rowId, ref.colId, ref.rowLock, ref.colLock)
  if (!a) return null
  if (ref.sheetId && ref.sheetId !== defaultSheetId) {
    const name = ctx.getSheetName(ref.sheetId)
    return `'${name.replace(/'/g, "''")}'!${a}`
  }
  return a
}

/** Stored internal formula → formula-bar A1 display. */
export function internalFormulaToDisplay(
  internalFormula: string,
  ctx: FormulaContext,
  defaultSheetId: string,
): string {
  const text = internalFormula.trim()
  if (!text.startsWith('=')) return text
  if (!hasInternalRefs(text)) return text

  let out = text
  const tokens = [...extractInternalRefTokens(text)].sort((a, b) => b.length - a.length)
  for (const token of tokens) {
    const ref = parseInternalRefToken(token)
    if (!ref) continue
    const a1 = internalRefToA1(ctx, ref, defaultSheetId)
    if (a1) out = out.split(token).join(a1)
  }
  return out
}

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
import { extractRefTokens, formatA1, parseRefToken } from './refs'

export { extractInternalRefTokens, hasInternalRefs } from './internal-ref-scan'

const ID = AXIS_ID_PATTERN

export function formatInternalCellRef(rowId: string, colId: string, sheetId?: string): string {
  if (sheetId) return `#@${sheetId}|${rowId}:${colId}#`
  return `#${rowId}:${colId}#`
}

export function formatInternalRangeRef(
  rowId0: string,
  colId0: string,
  rowId1: string,
  colId1: string,
  sheetId?: string,
): string {
  if (sheetId) return `#@${sheetId}|${rowId0}:${colId0}~${rowId1}:${colId1}#`
  return `#${rowId0}:${colId0}~${rowId1}:${colId1}#`
}

export interface InternalRef {
  sheetId?: string
  rowId: string
  colId: string
  endRowId?: string
  endColId?: string
}

export function parseInternalRefToken(token: string): InternalRef | null {
  const range = new RegExp(`^#(?:@([^|#]+)\\|)?(${ID}):(${ID})~(${ID}):(${ID})#$`).exec(token)
  if (range) {
    return {
      sheetId: range[1],
      rowId: range[2]!,
      colId: range[3]!,
      endRowId: range[4]!,
      endColId: range[5]!,
    }
  }
  const cell = new RegExp(`^#(?:@([^|#]+)\\|)?(${ID}):(${ID})#$`).exec(token)
  if (cell) {
    return { sheetId: cell[1], rowId: cell[2]!, colId: cell[3]! }
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
    return formatInternalRangeRef(a.rowId, a.colId, b.rowId, b.colId, cross)
  }

  if (ref.cell) {
    const ids = resolveIdsForA1(ctx, sheetResolved, ref.cell.r, ref.cell.c)
    if (!ids) return null
    const cross = sheetResolved !== defaultSheetId ? sheetResolved : undefined
    return formatInternalCellRef(ids.rowId, ids.colId, cross)
  }

  return null
}

/** User-facing A1 formula → canonical internal formula (stored in `f`). */
export function displayFormulaToInternal(
  displayFormula: string,
  ctx: FormulaContext,
  defaultSheetId: string,
): string {
  const text = displayFormula.trim()
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

  const toA1 = (rowId: string, colId: string): string | null => {
    const pos = ctx.idsToDisplay(sheetId, rowId, colId)
    if (!pos) return null
    return formatA1(pos.r, pos.c)
  }

  if (ref.endRowId != null && ref.endColId != null) {
    const a = toA1(ref.rowId, ref.colId)
    const b = toA1(ref.endRowId, ref.endColId)
    if (!a || !b) return null
    const local = a === b ? a : `${a}:${b}`
    if (ref.sheetId && ref.sheetId !== defaultSheetId) {
      const name = ctx.getSheetName(ref.sheetId)
      return `'${name.replace(/'/g, "''")}'!${local}`
    }
    return local
  }

  const a = toA1(ref.rowId, ref.colId)
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

import type { CommandContext } from '@speed-sheet/core'
import type { ProtectionEntry } from './types'
import {
  colDeleteAffectsProtection,
  colInsertAffectsProtection,
  colMoveAffectsProtection,
  normalizeRect,
  rangeOverlapsProtection,
  rowDeleteAffectsProtection,
  rowInsertAffectsProtection,
  rowMoveAffectsProtection,
} from './range'

const ALLOW_COMMANDS = new Set([
  'selectCell',
  'selectRange',
  'copy',
  'undo',
  'redo',
  'dismissFilterPanel',
  'downloadSheetImage',
  'recalculateFormulas',
  'protectRows',
  'protectCols',
  'protectCells',
  'unprotectEntry',
])

function selectionRect(state: CommandContext['state']) {
  const sel = state.getSelection()
  return normalizeRect(sel.row, sel.column)
}

function resolveAffectedRange(
  name: string,
  props: Record<string, unknown> | undefined,
  state: CommandContext['state'],
): { r0: number; r1: number; c0: number; c1: number } | null {
  const p = props ?? {}
  const sel = selectionRect(state)

  if (typeof p.r === 'number' && typeof p.c === 'number') {
    return { r0: p.r, r1: p.r, c0: p.c, c1: p.c }
  }

  if (Array.isArray(p.rows) && p.rows.length) {
    const rows = p.rows as number[]
    const r0 = Math.min(...rows)
    const r1 = Math.max(...rows)
    return { r0, r1, c0: sel.c0, c1: sel.c1 }
  }

  if (Array.isArray(p.cols) && p.cols.length) {
    const cols = p.cols as number[]
    const c0 = Math.min(...cols)
    const c1 = Math.max(...cols)
    return { r0: sel.r0, r1: sel.r1, c0, c1 }
  }

  if (Array.isArray(p.row) && Array.isArray(p.column)) {
    return normalizeRect(p.row as [number, number], p.column as [number, number])
  }

  if (name === 'clearSelection' || name === 'cut' || name === 'paste') {
    return sel
  }

  if (
    name.startsWith('set') ||
    name.startsWith('clear') ||
    name.startsWith('apply') ||
    name.startsWith('insert') ||
    name.startsWith('remove') ||
    name.startsWith('update') ||
    name.startsWith('toggle') ||
    name === 'mergeCells' ||
    name === 'unmergeCells'
  ) {
    return sel
  }

  if (name === 'prepareFilterFromSelection' || name === 'applyFilterSession' || name === 'clearFilter') {
    return sel
  }

  if (name === 'updateFilterColumnContent' && typeof p.column === 'number') {
    const c = p.column
    return { r0: sel.r0, r1: sel.r1, c0: c, c1: c }
  }

  return null
}

function structuralCommandTouchesProtection(
  name: string,
  props: Record<string, unknown> | undefined,
  entries: ProtectionEntry[],
): boolean {
  const p = props ?? {}

  if (name === 'insertRows' && typeof p.at === 'number') {
    const at = p.at
    return entries.some((entry) => rowInsertAffectsProtection(entry, at))
  }

  if (name === 'deleteRows' && typeof p.at === 'number') {
    const at = p.at
    const count = typeof p.count === 'number' ? p.count : 1
    return entries.some((entry) => rowDeleteAffectsProtection(entry, at, count))
  }

  if (name === 'moveRows' && typeof p.from === 'number' && typeof p.insertBefore === 'number') {
    const from = p.from
    const insertBefore = p.insertBefore
    const count = typeof p.count === 'number' ? p.count : 1
    return entries.some((entry) => rowMoveAffectsProtection(entry, from, insertBefore, count))
  }

  if (name === 'insertCols' && typeof p.at === 'number') {
    const at = p.at
    return entries.some((entry) => colInsertAffectsProtection(entry, at))
  }

  if (name === 'deleteCols' && typeof p.at === 'number') {
    const at = p.at
    const count = typeof p.count === 'number' ? p.count : 1
    return entries.some((entry) => colDeleteAffectsProtection(entry, at, count))
  }

  if (name === 'moveCols' && typeof p.from === 'number' && typeof p.insertBefore === 'number') {
    const from = p.from
    const insertBefore = p.insertBefore
    const count = typeof p.count === 'number' ? p.count : 1
    return entries.some((entry) => colMoveAffectsProtection(entry, from, insertBefore, count))
  }

  if (name === 'setRowHeight') {
    const rows =
      Array.isArray(p.rows) && p.rows.length
        ? (p.rows as number[])
        : typeof p.row === 'number'
          ? [p.row]
          : []
    if (!rows.length) return false
    const r0 = Math.min(...rows)
    const r1 = Math.max(...rows)
    return entries.some((entry) =>
      rangeOverlapsProtection([entry], r0, r1, entry.column[0], entry.column[1]),
    )
  }

  if (name === 'setColWidth') {
    const cols =
      Array.isArray(p.cols) && p.cols.length
        ? (p.cols as number[])
        : typeof p.col === 'number'
          ? [p.col]
          : []
    if (!cols.length) return false
    const c0 = Math.min(...cols)
    const c1 = Math.max(...cols)
    return entries.some((entry) =>
      rangeOverlapsProtection([entry], entry.row[0], entry.row[1], c0, c1),
    )
  }

  return false
}

export function isCommandBlockedByProtection(
  name: string,
  props: unknown,
  ctx: CommandContext,
  entries: ProtectionEntry[],
): boolean {
  if (!entries.length) return false
  if (ALLOW_COMMANDS.has(name)) return false

  const rawProps = (props ?? {}) as Record<string, unknown>

  if (structuralCommandTouchesProtection(name, rawProps, entries)) {
    return true
  }

  const range = resolveAffectedRange(name, rawProps, ctx.state)
  if (!range) return false
  return rangeOverlapsProtection(entries, range.r0, range.r1, range.c0, range.c1)
}

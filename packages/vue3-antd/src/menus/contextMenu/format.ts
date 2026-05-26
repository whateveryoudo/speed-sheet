import { colToLetter } from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'

/** 语雀式行号（1-based） */
export function formatRowLabel(row: [number, number]): string {
  const a = row[0] + 1
  const b = row[1] + 1
  return a === b ? String(a) : `${a}-${b}`
}

export function formatColLabel(column: [number, number]): string {
  const a = colToLetter(column[0])
  const b = colToLetter(column[1])
  return a === b ? a : `${a}-${b}`
}

export function selectionRowCount(selection: Selection): number {
  return selection.row[1] - selection.row[0] + 1
}

export function selectionColCount(selection: Selection): number {
  return selection.column[1] - selection.column[0] + 1
}

export function isMultiCellSelection(selection: Selection): boolean {
  return selectionRowCount(selection) > 1 || selectionColCount(selection) > 1
}

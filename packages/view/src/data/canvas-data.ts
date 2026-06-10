import type { Selection } from '@speed-sheet/shared'
import type { Sheet, CellEntry } from '@speed-sheet/core'

const EMPTY_SEL: Selection = { row: [0, 0], column: [0, 0] }

export function getSheetSelection(sheet: Sheet | null, revision: number): Selection {
  void revision
  return sheet?.state.getSelection() ?? EMPTY_SEL
}

export function getSheetCells(sheet: Sheet | null, revision: number) {
  void revision
  return sheet?.state.getAllCells() ?? []
}

export function getActiveCell(sel: Selection): { r: number; c: number } {
  return {
    r: sel.anchor?.r ?? sel.row[0],
    c: sel.anchor?.c ?? sel.column[0],
  }
}

export function toCellEntries(
  cells: ReturnType<typeof getSheetCells>,
): CellEntry[] {
  return cells.map((c) => ({ r: c.r, c: c.c, data: c.data } as CellEntry))
}

export function applySelectRange(
  sheet: Sheet | null,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  anchorR?: number,
  anchorC?: number,
): { r0: number; c0: number; r1: number; c1: number; anchorR: number; anchorC: number } {
  const ar = anchorR ?? r0
  const ac = anchorC ?? c0
  sheet
    ?.chain()
    .selectRange({ row: [r0, r1], column: [c0, c1], anchor: { r: ar, c: ac } })
    .run()
  return { r0, c0, r1, c1, anchorR: ar, anchorC: ac }
}

import type { Selection } from '@speed-sheet/shared'

export function pointInSelection(r: number, c: number, selection: Selection): boolean {
  const [r0, r1] = selection.row
  const [c0, c1] = selection.column
  return r >= r0 && r <= r1 && c >= c0 && c <= c1
}

export function isMultiCellSelection(selection: Selection): boolean {
  const [r0, r1] = selection.row
  const [c0, c1] = selection.column
  return r1 > r0 || c1 > c0
}

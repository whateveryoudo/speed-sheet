import type { Selection } from '@speed-sheet/shared'

export type RowMoveBlock = { from: number; count: number }
export type ColMoveBlock = { from: number; count: number }

/** If startRow is inside the current row selection, move the whole block. */
export function resolveMoveRowBlock(
  startRow: number,
  selection: Selection | null | undefined,
): RowMoveBlock {
  if (!selection) return { from: startRow, count: 1 }
  const r0 = Math.min(selection.row[0], selection.row[1])
  const r1 = Math.max(selection.row[0], selection.row[1])
  if (startRow >= r0 && startRow <= r1) {
    return { from: r0, count: r1 - r0 + 1 }
  }
  return { from: startRow, count: 1 }
}

/** If startCol is inside the current column selection, move the whole block. */
export function resolveMoveColBlock(
  startCol: number,
  selection: Selection | null | undefined,
): ColMoveBlock {
  if (!selection) return { from: startCol, count: 1 }
  const c0 = Math.min(selection.column[0], selection.column[1])
  const c1 = Math.max(selection.column[0], selection.column[1])
  if (startCol >= c0 && startCol <= c1) {
    return { from: c0, count: c1 - c0 + 1 }
  }
  return { from: startCol, count: 1 }
}

/** Rows to resize together when handle is inside the current row selection. */
export function resolveResizeRows(
  row: number,
  selection: Selection | null | undefined,
): number[] | undefined {
  if (!selection) return undefined
  const r0 = Math.min(selection.row[0], selection.row[1])
  const r1 = Math.max(selection.row[0], selection.row[1])
  if (row < r0 || row > r1) return undefined
  const rows: number[] = []
  for (let r = r0; r <= r1; r++) rows.push(r)
  return rows
}

/** Columns to resize together when handle is inside the current column selection. */
export function resolveResizeCols(
  col: number,
  selection: Selection | null | undefined,
): number[] | undefined {
  if (!selection) return undefined
  const c0 = Math.min(selection.column[0], selection.column[1])
  const c1 = Math.max(selection.column[0], selection.column[1])
  if (col < c0 || col > c1) return undefined
  const cols: number[] = []
  for (let c = c0; c <= c1; c++) cols.push(c)
  return cols
}

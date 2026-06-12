import type { CellAttributes, MergeRange } from '@speed-sheet/shared'

export type ViewportCellBounds = {
  rowStart: number
  rowEnd: number
  colStart: number
  colEnd: number
}

const DEFAULT_OVERFLOW_PAD = 2

/** Expand visible range for merge spillover and text-overflow neighbors. */
export function expandViewportCellBounds(
  bounds: ViewportCellBounds,
  totalRows: number,
  totalCols: number,
  merges: readonly MergeRange[],
  overflowPad = DEFAULT_OVERFLOW_PAD,
): ViewportCellBounds {
  const vis = bounds
  let rowStart = Math.max(0, vis.rowStart - overflowPad)
  let rowEnd = Math.min(totalRows - 1, vis.rowEnd + overflowPad)
  let colStart = Math.max(0, vis.colStart - overflowPad)
  let colEnd = Math.min(totalCols - 1, vis.colEnd + overflowPad)

  for (const m of merges) {
    const mr1 = m.r + m.rs - 1
    const mc1 = m.c + m.cs - 1
    if (mr1 < vis.rowStart || m.r > vis.rowEnd || mc1 < vis.colStart || m.c > vis.colEnd) {
      continue
    }
    rowStart = Math.min(rowStart, m.r)
    rowEnd = Math.max(rowEnd, mr1)
    colStart = Math.min(colStart, m.c)
    colEnd = Math.max(colEnd, mc1)
  }

  return { rowStart, rowEnd, colStart, colEnd }
}

export function isCellInViewportBounds(
  r: number,
  c: number,
  bounds: ViewportCellBounds,
): boolean {
  return r >= bounds.rowStart && r <= bounds.rowEnd && c >= bounds.colStart && c <= bounds.colEnd
}

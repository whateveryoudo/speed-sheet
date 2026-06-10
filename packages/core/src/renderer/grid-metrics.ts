/** Luckysheet-aligned limits */
export const MIN_ROW_HEIGHT = 19
export const MIN_COL_WIDTH = 30

export interface GridMetricsSource {
  totalRows: number
  totalCols: number
  defaultRowHeight: number
  defaultColWidth: number
  getRowHeight?: (r: number) => number | undefined
  getColWidth?: (c: number) => number | undefined
  /** 筛选等本地视图：返回 true 时该行高度为 0（不参与布局） */
  isRowHidden?: (r: number) => boolean
}

export interface GridMetrics {
  totalRows: number
  totalCols: number
  defaultRowHeight: number
  defaultColWidth: number
  rowHeight(r: number): number
  colWidth(c: number): number
  rowTop(r: number): number
  rowBottom(r: number): number
  colLeft(c: number): number
  colRight(c: number): number
  totalHeight: number
  totalWidth: number
  /** Content y → row index */
  rowAtY(y: number): number
  /** Content x → col index */
  colAtX(x: number): number
}

export function buildGridMetrics(src: GridMetricsSource): GridMetrics {
  const { totalRows, totalCols, defaultRowHeight, defaultColWidth } = src

  const rowHeights: number[] = []
  const rowTops: number[] = [0]
  for (let r = 0; r < totalRows; r++) {
    if (src.isRowHidden?.(r)) {
      rowHeights.push(0)
      rowTops.push(rowTops[r]!)
      continue
    }
    const raw = src.getRowHeight?.(r)
    const h = Math.max(MIN_ROW_HEIGHT, raw ?? defaultRowHeight)
    rowHeights.push(h)
    rowTops.push(rowTops[r]! + h)
  }

  const colWidths: number[] = []
  const colLefts: number[] = [0]
  for (let c = 0; c < totalCols; c++) {
    const raw = src.getColWidth?.(c)
    const w = Math.max(MIN_COL_WIDTH, raw ?? defaultColWidth)
    colWidths.push(w)
    colLefts.push(colLefts[c]! + w)
  }

  const totalHeight = rowTops[totalRows] ?? 0
  const totalWidth = colLefts[totalCols] ?? 0

  function rowAtY(y: number): number {
    if (y < 0) return 0
    if (y >= totalHeight) return Math.max(0, totalRows - 1)
    let lo = 0
    let hi = totalRows - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (rowTops[mid]! <= y) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  function colAtX(x: number): number {
    if (x < 0) return 0
    if (x >= totalWidth) return Math.max(0, totalCols - 1)
    let lo = 0
    let hi = totalCols - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (colLefts[mid]! <= x) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  return {
    totalRows,
    totalCols,
    defaultRowHeight,
    defaultColWidth,
    rowHeight: (r) => rowHeights[r] ?? defaultRowHeight,
    colWidth: (c) => colWidths[c] ?? defaultColWidth,
    rowTop: (r) => rowTops[r] ?? 0,
    rowBottom: (r) => rowTops[r + 1] ?? totalHeight,
    colLeft: (c) => colLefts[c] ?? 0,
    colRight: (c) => colLefts[c + 1] ?? totalWidth,
    totalHeight,
    totalWidth,
    rowAtY,
    colAtX,
  }
}

/** Visible index range for variable row/col sizes */
export function getVisibleRangeFromMetrics(
  metrics: GridMetrics,
  layout: {
    rowHeaderWidth: number
    columnHeaderHeight: number
    scrollX: number
    scrollY: number
    viewportW: number
    viewportH: number
    freeze?: { xSplit?: number; ySplit?: number } | null
  },
): { rowStart: number; rowEnd: number; colStart: number; colEnd: number } {
  const { rowHeaderWidth: RHW, columnHeaderHeight: CHH, scrollX: sx, scrollY: sy, viewportW: vw, viewportH: vh } =
    layout

  const xSplit = layout.freeze?.xSplit ?? 0
  const ySplit = layout.freeze?.ySplit ?? 0

  const frozenW =
    xSplit > 0 ? metrics.colRight(xSplit - 1) - metrics.colLeft(0) : 0
  const frozenH =
    ySplit > 0 ? metrics.rowBottom(ySplit - 1) - metrics.rowTop(0) : 0

  const contentW = Math.max(0, vw - RHW - frozenW)
  const contentH = Math.max(0, vh - CHH - frozenH)

  let colStart: number
  let colEnd: number
  if (xSplit > 0) {
    const origin = metrics.colLeft(xSplit)
    const relScroll = Math.max(0, sx - origin)
    colStart = 0
    colEnd = Math.min(
      metrics.totalCols - 1,
      Math.max(xSplit - 1, metrics.colAtX(origin + relScroll + contentW) + 1),
    )
  } else {
    colStart = Math.max(0, metrics.colAtX(sx))
    colEnd = Math.min(metrics.totalCols - 1, metrics.colAtX(sx + Math.max(0, vw - RHW)) + 1)
  }

  let rowStart: number
  let rowEnd: number
  if (ySplit > 0) {
    const origin = metrics.rowTop(ySplit)
    const relScroll = Math.max(0, sy - origin)
    rowStart = 0
    rowEnd = Math.min(
      metrics.totalRows - 1,
      Math.max(ySplit - 1, metrics.rowAtY(origin + relScroll + contentH) + 1),
    )
  } else {
    rowStart = Math.max(0, metrics.rowAtY(sy))
    rowEnd = Math.min(metrics.totalRows - 1, metrics.rowAtY(sy + Math.max(0, vh - CHH)) + 1)
  }

  return {
    rowStart,
    rowEnd,
    colStart,
    colEnd,
  }
}

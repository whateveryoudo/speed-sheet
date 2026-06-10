import type { GridLayout } from './grid-layout'
import { frozenColPixelWidth, frozenRowPixelHeight } from '../freeze/freeze-utils'
import { buildGridMetrics, type GridMetrics } from './grid-metrics'

export function resolveMetrics(layout: GridLayout): GridMetrics {
  if (layout.metrics) return layout.metrics
  return buildGridMetrics({
    totalRows: layout.totalRows,
    totalCols: layout.totalCols,
    defaultRowHeight: layout.defaultRowHeight,
    defaultColWidth: layout.defaultColWidth,
  })
}

function freezeSplits(layout: GridLayout): { xSplit: number; ySplit: number } {
  return {
    xSplit: layout.freeze?.xSplit ?? 0,
    ySplit: layout.freeze?.ySplit ?? 0,
  }
}

export function gridCellX(layout: GridLayout, M: GridMetrics, c: number): number {
  const { xSplit } = freezeSplits(layout)
  const RHW = layout.rowHeaderWidth
  const sx = layout.scrollX

  if (xSplit > 0 && c < xSplit) {
    return RHW + M.colLeft(c)
  }
  if (xSplit > 0) {
    const frozenW = frozenColPixelWidth(M, xSplit)
    const scrollOrigin = M.colLeft(xSplit)
    return RHW + frozenW + M.colLeft(c) - scrollOrigin - Math.max(0, sx - scrollOrigin)
  }
  return RHW + M.colLeft(c) - sx
}

export function gridCellY(layout: GridLayout, M: GridMetrics, r: number): number {
  const { ySplit } = freezeSplits(layout)
  const CHH = layout.columnHeaderHeight
  const sy = layout.scrollY

  if (ySplit > 0 && r < ySplit) {
    return CHH + M.rowTop(r)
  }
  if (ySplit > 0) {
    const frozenH = frozenRowPixelHeight(M, ySplit)
    const scrollOrigin = M.rowTop(ySplit)
    return CHH + frozenH + M.rowTop(r) - scrollOrigin - Math.max(0, sy - scrollOrigin)
  }
  return CHH + M.rowTop(r) - sy
}

/** Canvas 内容区坐标 → 单元格索引（含冻结） */
export function canvasPointToCell(
  layout: GridLayout,
  M: GridMetrics,
  canvasX: number,
  canvasY: number,
): { r: number; c: number } {
  const RHW = layout.rowHeaderWidth
  const CHH = layout.columnHeaderHeight
  const contentX = canvasX - RHW
  const contentY = canvasY - CHH
  const { xSplit, ySplit } = freezeSplits(layout)

  let c = 0
  if (contentX >= 0) {
    if (xSplit > 0) {
      const frozenW = frozenColPixelWidth(M, xSplit)
      const origin = M.colLeft(xSplit)
      const relScroll = Math.max(0, layout.scrollX - origin)
      if (contentX < frozenW) {
        c = M.colAtX(contentX)
      } else {
        c = M.colAtX(origin + (contentX - frozenW) + relScroll)
      }
    } else {
      c = M.colAtX(contentX + layout.scrollX)
    }
  }

  let r = 0
  if (contentY >= 0) {
    if (ySplit > 0) {
      const frozenH = frozenRowPixelHeight(M, ySplit)
      const origin = M.rowTop(ySplit)
      const relScroll = Math.max(0, layout.scrollY - origin)
      if (contentY < frozenH) {
        r = M.rowAtY(contentY)
      } else {
        r = M.rowAtY(origin + (contentY - frozenH) + relScroll)
      }
    } else {
      r = M.rowAtY(contentY + layout.scrollY)
    }
  }

  return { r, c }
}

export function selectionBox(
  layout: GridLayout,
  M: GridMetrics,
  r0: number,
  c0: number,
  r1: number,
  c1: number,
): { x: number; y: number; w: number; h: number } {
  const x = gridCellX(layout, M, c0)
  const y = gridCellY(layout, M, r0)
  return {
    x,
    y,
    w: gridCellX(layout, M, c1) + M.colWidth(c1) - x,
    h: gridCellY(layout, M, r1) + M.rowHeight(r1) - y,
  }
}

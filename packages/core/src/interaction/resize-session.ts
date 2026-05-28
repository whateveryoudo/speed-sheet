import type { Selection } from '@speed-sheet/shared'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import { MIN_COL_WIDTH, MIN_ROW_HEIGHT } from '../renderer/grid-metrics'
import { resolveResizeCols, resolveResizeRows } from './selection-block'
import type { CanvasPointer } from './pointer'

export type ResizeAxis = 'row' | 'col'

export type ResizePreview = {
  axis: ResizeAxis
  guidePos: number
}

export type RowResizeCommit = {
  axis: 'row'
  row: number
  height: number
  rows?: number[]
}

export type ColResizeCommit = {
  axis: 'col'
  col: number
  width: number
  cols?: number[]
}

export type ResizeCommit = RowResizeCommit | ColResizeCommit

export function computeRowHeightFromPointer(
  contentY: number,
  rowIndex: number,
  metrics: GridMetrics,
): number {
  return Math.max(MIN_ROW_HEIGHT, contentY - metrics.rowTop(rowIndex))
}

export function computeColWidthFromPointer(
  contentX: number,
  colIndex: number,
  metrics: GridMetrics,
): number {
  return Math.max(MIN_COL_WIDTH, contentX - metrics.colLeft(colIndex))
}

export function rowResizeGuidePos(
  rowIndex: number,
  height: number,
  layout: GridLayout,
  metrics: GridMetrics,
): number {
  const { columnHeaderHeight: chh, scrollY } = layout
  return chh + metrics.rowTop(rowIndex) + height - scrollY
}

export function colResizeGuidePos(
  colIndex: number,
  width: number,
  layout: GridLayout,
  metrics: GridMetrics,
): number {
  const { rowHeaderWidth: rhw, scrollX } = layout
  return rhw + metrics.colLeft(colIndex) + width - scrollX
}

/** Headless row/col resize drag session (preview guide + commit payload). */
export class ResizeSession {
  private axis: ResizeAxis | null = null
  private index = 0

  get active(): boolean {
    return this.axis != null
  }

  start(axis: ResizeAxis, index: number): void {
    this.axis = axis
    this.index = index
  }

  update(
    pointer: CanvasPointer,
    layout: GridLayout,
    metrics: GridMetrics,
  ): ResizePreview | null {
    if (!this.axis) return null
    if (this.axis === 'row') {
      const height = computeRowHeightFromPointer(
        pointer.contentY,
        this.index,
        metrics,
      )
      return {
        axis: 'row',
        guidePos: rowResizeGuidePos(this.index, height, layout, metrics),
      }
    }
    const width = computeColWidthFromPointer(pointer.contentX, this.index, metrics)
    return {
      axis: 'col',
      guidePos: colResizeGuidePos(this.index, width, layout, metrics),
    }
  }

  commit(
    pointer: CanvasPointer,
    layout: GridLayout,
    metrics: GridMetrics,
    selection: Selection | null | undefined,
  ): ResizeCommit | null {
    if (!this.axis) return null
    const axis = this.axis
    const index = this.index
    this.cancel()

    if (axis === 'row') {
      const height = computeRowHeightFromPointer(pointer.contentY, index, metrics)
      return {
        axis: 'row',
        row: index,
        height,
        rows: resolveResizeRows(index, selection),
      }
    }
    const width = computeColWidthFromPointer(pointer.contentX, index, metrics)
    return {
      axis: 'col',
      col: index,
      width,
      cols: resolveResizeCols(index, selection),
    }
  }

  cancel(): void {
    this.axis = null
    this.index = 0
  }
}

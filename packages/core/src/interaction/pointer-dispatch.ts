import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import type { Selection } from '@speed-sheet/shared'
import type { MergeContext } from '../merge'
import { hitColResizeHandle, hitRowResizeHandle } from '../renderer/resize-hit'
import { hitColHeader, hitColMoveHandle } from '../renderer/col-move-hit'
import { hitRowHeader, hitRowMoveHandle } from '../renderer/row-move-hit'
import { hitSelectionHandle } from './selection-handle'

export type CanvasPointerTarget =
  | { type: 'row-resize'; index: number }
  | { type: 'col-resize'; index: number }
  | { type: 'row-move'; index: number }
  | { type: 'col-move'; index: number }
  | { type: 'row-header'; index: number }
  | { type: 'col-header'; index: number }
  | { type: 'none' }

export type PointerCursor =
  | 'row-resize'
  | 'col-resize'
  | 'grab'
  | 'grabbing'
  | 'cell'
  | 'crosshair'
  | 'default'

/** Mousedown hit priority on the canvas: resize edge → move handle (near edge) → header selection. */
export function resolveCanvasPointerTarget(
  canvasX: number,
  canvasY: number,
  layout: GridLayout,
  metrics: GridMetrics,
): CanvasPointerTarget {
  const rowHit = hitRowResizeHandle(canvasX, canvasY, layout, metrics)
  if (rowHit != null) return { type: 'row-resize', index: rowHit }

  const colHit = hitColResizeHandle(canvasX, canvasY, layout, metrics)
  if (colHit != null) return { type: 'col-resize', index: colHit }

  const rowMoveHit = hitRowMoveHandle(canvasX, canvasY, layout, metrics)
  if (rowMoveHit != null) return { type: 'row-move', index: rowMoveHit }

  const colMoveHit = hitColMoveHandle(canvasX, canvasY, layout, metrics)
  if (colMoveHit != null) return { type: 'col-move', index: colMoveHit }

  const rowHeaderHit = hitRowHeader(canvasX, canvasY, layout, metrics)
  if (rowHeaderHit != null) return { type: 'row-header', index: rowHeaderHit }

  const colHeaderHit = hitColHeader(canvasX, canvasY, layout, metrics)
  if (colHeaderHit != null) return { type: 'col-header', index: colHeaderHit }

  return { type: 'none' }
}

export function resolvePointerCursor(
  canvasX: number,
  canvasY: number,
  layout: GridLayout,
  metrics: GridMetrics,
  options?: {
    rowMoveDragging?: boolean
    colMoveDragging?: boolean
    selection?: Selection | null
    mergeCtx?: MergeContext
    editingCell?: { r: number; c: number }
    autofillDragging?: boolean
  },
): PointerCursor {
  if (options?.autofillDragging) return 'crosshair'
  if (options?.rowMoveDragging || options?.colMoveDragging) return 'grabbing'

  // 鼠标悬停在选区右下角填充柄上时显示十字光标
  if (
    options?.selection &&
    hitSelectionHandle(
      canvasX,
      canvasY,
      layout,
      metrics,
      options.selection,
      options.mergeCtx,
      options.editingCell,
    )
  ) {
    return 'crosshair'
  }

  const target = resolveCanvasPointerTarget(canvasX, canvasY, layout, metrics)
  switch (target.type) {
    case 'row-resize':
      return 'row-resize'
    case 'col-resize':
      return 'col-resize'
    case 'row-move':
    case 'col-move':
      return 'grab'
    case 'row-header':
    case 'col-header':
      return 'default'
    default:
      return 'cell'
  }
}

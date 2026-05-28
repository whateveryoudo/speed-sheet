import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import { hitColResizeHandle, hitRowResizeHandle } from '../renderer/resize-hit'
import { hitColHeader } from '../renderer/col-move-hit'
import { hitRowHeader } from '../renderer/row-move-hit'

export type CanvasPointerTarget =
  | { type: 'row-resize'; index: number }
  | { type: 'col-resize'; index: number }
  | { type: 'row-move'; index: number }
  | { type: 'col-move'; index: number }
  | { type: 'none' }

export type PointerCursor =
  | 'row-resize'
  | 'col-resize'
  | 'grab'
  | 'grabbing'
  | 'cell'

/** Mousedown hit priority on the canvas: resize edge → row header drag. */
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

  const rowHeaderHit = hitRowHeader(canvasX, canvasY, layout, metrics)
  if (rowHeaderHit != null) return { type: 'row-move', index: rowHeaderHit }

  const colHeaderHit = hitColHeader(canvasX, canvasY, layout, metrics)
  if (colHeaderHit != null) return { type: 'col-move', index: colHeaderHit }

  return { type: 'none' }
}

export function resolvePointerCursor(
  canvasX: number,
  canvasY: number,
  layout: GridLayout,
  metrics: GridMetrics,
  options?: { rowMoveDragging?: boolean; colMoveDragging?: boolean },
): PointerCursor {
  if (options?.rowMoveDragging || options?.colMoveDragging) return 'grabbing'
  const target = resolveCanvasPointerTarget(canvasX, canvasY, layout, metrics)
  switch (target.type) {
    case 'row-resize':
      return 'row-resize'
    case 'col-resize':
      return 'col-resize'
    case 'row-move':
    case 'col-move':
      return 'grab'
    default:
      return 'cell'
  }
}

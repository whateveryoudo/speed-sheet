import type { GridLayout } from '../renderer/grid-layout'

/** Pointer position in canvas and sheet content coordinates. */
export type CanvasPointer = {
  canvasX: number
  canvasY: number
  contentX: number
  contentY: number
}

export function pointerFromCanvasCoords(
  canvasX: number,
  canvasY: number,
  layout: GridLayout,
): CanvasPointer {
  const { rowHeaderWidth: rhw, columnHeaderHeight: chh, scrollX, scrollY } = layout
  return {
    canvasX,
    canvasY,
    contentX: canvasX - rhw + scrollX,
    contentY: canvasY - chh + scrollY,
  }
}

export function pointerFromMouseEvent(
  e: MouseEvent,
  canvasRect: DOMRect,
  layout: GridLayout,
): CanvasPointer {
  const canvasX = e.clientX - canvasRect.left
  const canvasY = e.clientY - canvasRect.top
  return pointerFromCanvasCoords(canvasX, canvasY, layout)
}

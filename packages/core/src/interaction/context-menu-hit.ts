import type { Selection } from '@speed-sheet/shared'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import type { CanvasPointer } from './pointer'
import type { CellPoint } from './cell-pointer'
import { isMultiCellSelection, pointInSelection } from './selection-utils'

export type ContextMenuTarget = 'cell' | 'range' | 'row' | 'column'

export type ContextMenuAction =
  | { type: 'select-column'; col: number }
  | { type: 'select-row'; row: number }
  | { type: 'select-cell'; r: number; c: number }
  | { type: 'keep-selection' }

export type ContextMenuHitResult = {
  r: number
  c: number
  clientX: number
  clientY: number
  target: ContextMenuTarget
  action: ContextMenuAction
}

export type ContextMenuPointer = CanvasPointer & {
  clientX: number
  clientY: number
}

/** Map context-menu action to a selectRange payload (null = keep current selection). */
export function selectRangeFromContextAction(
  action: ContextMenuAction,
  totalRows: number,
  totalCols: number,
): {
  row: [number, number]
  column: [number, number]
  anchor: { r: number; c: number }
} | null {
  switch (action.type) {
    case 'select-column':
      return {
        row: [0, totalRows - 1],
        column: [action.col, action.col],
        anchor: { r: 0, c: action.col },
      }
    case 'select-row':
      return {
        row: [action.row, action.row],
        column: [0, totalCols - 1],
        anchor: { r: action.row, c: 0 },
      }
    case 'select-cell':
      return {
        row: [action.r, action.r],
        column: [action.c, action.c],
        anchor: { r: action.r, c: action.c },
      }
    case 'keep-selection':
      return null
  }
}

/**
 * Resolve right-click target and selection side-effect (WPS / 语雀 style).
 * Uses variable row/col metrics for header hits.
 */
export function resolveContextMenuHit(
  pointer: ContextMenuPointer,
  layout: GridLayout,
  metrics: GridMetrics,
  currentSelection: Selection,
  cellPoint: CellPoint | null,
): ContextMenuHitResult | null {
  const { rowHeaderWidth: rhw, columnHeaderHeight: chh } = layout
  const { canvasX: x, canvasY: y, clientX, clientY } = pointer

  if (y < chh && x >= rhw) {
    const c = metrics.colAtX(pointer.contentX)
    return {
      r: currentSelection.row[0],
      c,
      clientX,
      clientY,
      target: 'column',
      action: { type: 'select-column', col: c },
    }
  }

  if (x < rhw && y >= chh) {
    const r = metrics.rowAtY(pointer.contentY)
    return {
      r,
      c: currentSelection.column[0],
      clientX,
      clientY,
      target: 'row',
      action: { type: 'select-row', row: r },
    }
  }

  if (!cellPoint) return null

  if (pointInSelection(cellPoint.r, cellPoint.c, currentSelection) &&
    isMultiCellSelection(currentSelection)) {
    return {
      r: cellPoint.r,
      c: cellPoint.c,
      clientX,
      clientY,
      target: 'range',
      action: { type: 'keep-selection' },
    }
  }

  return {
    r: cellPoint.r,
    c: cellPoint.c,
    clientX,
    clientY,
    target: 'cell',
    action: { type: 'select-cell', r: cellPoint.r, c: cellPoint.c },
  }
}

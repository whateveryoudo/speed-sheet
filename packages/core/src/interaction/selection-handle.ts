import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import type { Selection } from '@speed-sheet/shared'
import { MergeContext } from '../merge'
import { selectionBox } from '../renderer/layout-metrics'

export function getSelectionHandleRect(
  layout: GridLayout,
  metrics: GridMetrics,
  selection: Selection,
  mergeCtx?: MergeContext,
  editingCell?: { r: number; c: number },
): { x: number; y: number; w: number; h: number } | null {
  const r0 = Math.min(selection.row[0], selection.row[1])
  const r1 = Math.max(selection.row[0], selection.row[1])
  const c0 = Math.min(selection.column[0], selection.column[1])
  const c1 = Math.max(selection.column[0], selection.column[1])
  const ar = selection.anchor?.r ?? r0
  const ac = selection.anchor?.c ?? c0

  if (editingCell != null && editingCell.r === ar && editingCell.c === ac) return null

  const mc = mergeCtx ?? MergeContext.empty()
  const matchingMerge = mc.findMatchingSelection(r0, c0, r1, c1)
  const handleRect = matchingMerge
    ? mc.pixelRect(matchingMerge, layout, metrics)
    : selectionBox(layout, metrics, r0, c0, r1, c1)

  return {
    x: handleRect.x + handleRect.w - 4,
    y: handleRect.y + handleRect.h - 4,
    w: 6,
    h: 6,
  }
}

export function hitSelectionHandle(
  canvasX: number,
  canvasY: number,
  layout: GridLayout,
  metrics: GridMetrics,
  selection: Selection | undefined | null,
  mergeCtx?: MergeContext,
  editingCell?: { r: number; c: number },
  hitTolerance = 6,
): boolean {
  if (!selection) return false
  const rect = getSelectionHandleRect(layout, metrics, selection, mergeCtx, editingCell)
  if (!rect) return false

  return (
    canvasX >= rect.x - hitTolerance &&
    canvasX <= rect.x + rect.w + hitTolerance &&
    canvasY >= rect.y - hitTolerance &&
    canvasY <= rect.y + rect.h + hitTolerance
  )
}

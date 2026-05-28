import { type Ref, type ComputedRef } from 'vue'
import {
  SelectDragSession,
  cellPointFromMouse,
  MergeContext,
  type GridLayout,
  type GridMetrics,
} from '@speed-sheet/core'

/**
 * Cell pointer + range-drag session (no DOM listeners — caller wires document events).
 * Shares document mousemove with formula ref-pick drag in SheetCanvas.
 */
export function useSheetSelectionDrag(options: {
  canvasEl: Ref<HTMLCanvasElement | undefined>
  getLayout: () => GridLayout
  getMetrics: ComputedRef<GridMetrics> | Ref<GridMetrics>
  getMergeContext?: () => MergeContext
  onSelectRange: (
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    anchorR: number,
    anchorC: number,
  ) => void
}) {
  const session = new SelectDragSession()

  function isActive(): boolean {
    return session.active
  }

  /** 指针下的显示格（合并区内落到锚点，用于编辑/提交） */
  function cellPointFromEvent(e: MouseEvent): { r: number; c: number } | null {
    const canvas = options.canvasEl.value
    if (!canvas) return null
    return cellPointFromMouse(
      e,
      canvas.getBoundingClientRect(),
      options.getLayout(),
      options.getMetrics.value,
      options.getMergeContext?.(),
    )
  }

  /** 指针下的物理格（不解析合并锚点，用于框选范围） */
  function rawCellPointFromEvent(e: MouseEvent): { r: number; c: number } | null {
    const canvas = options.canvasEl.value
    if (!canvas) return null
    return cellPointFromMouse(
      e,
      canvas.getBoundingClientRect(),
      options.getLayout(),
      options.getMetrics.value,
      MergeContext.empty(),
    )
  }

  function start(r: number, c: number): void {
    session.start(r, c)
  }

  function updateFromEvent(e: MouseEvent): boolean {
    const pt = cellPointFromEvent(e)
    if (!pt) return false
    const payload = session.update(pt)
    if (!payload) return false
    const { anchor, row, column } = payload
    options.onSelectRange(row[0], column[0], row[1], column[1], anchor.r, anchor.c)
    return true
  }

  function cancel(): void {
    session.cancel()
  }

  return {
    isActive,
    cellPointFromEvent,
    rawCellPointFromEvent,
    start,
    updateFromEvent,
    cancel,
  }
}

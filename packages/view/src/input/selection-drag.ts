import {
  SelectDragSession,
  cellPointFromMouse,
  MergeContext,
  type GridLayout,
  type GridMetrics,
} from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'

export type SelectionDragOptions = {
  getCanvas: () => HTMLCanvasElement | undefined
  getLayout: () => GridLayout
  getMetrics: () => GridMetrics
  getMergeContext?: () => MergeContext
}

/** Cell pointer + range-drag session (no DOM listeners — caller wires document events). */
export class SelectionDragController {
  private readonly session = new SelectDragSession()
  private previewSelection: Selection | null = null

  constructor(private readonly options: SelectionDragOptions) {}

  isActive(): boolean {
    return this.session.active
  }

  getPreviewSelection(): Selection | null {
    return this.previewSelection
  }

  cellPointFromEvent(e: MouseEvent): { r: number; c: number } | null {
    const canvas = this.options.getCanvas()
    if (!canvas) return null
    return cellPointFromMouse(
      e,
      canvas.getBoundingClientRect(),
      this.options.getLayout(),
      this.options.getMetrics(),
      this.options.getMergeContext?.(),
    )
  }

  rawCellPointFromEvent(e: MouseEvent): { r: number; c: number } | null {
    const canvas = this.options.getCanvas()
    if (!canvas) return null
    return cellPointFromMouse(
      e,
      canvas.getBoundingClientRect(),
      this.options.getLayout(),
      this.options.getMetrics(),
      MergeContext.empty(),
    )
  }

  start(r: number, c: number): void {
    this.session.start(r, c)
    this.previewSelection = {
      row: [r, r],
      column: [c, c],
      anchor: { r, c },
    }
  }

  updateFromEvent(e: MouseEvent): boolean {
    const pt = this.cellPointFromEvent(e)
    if (!pt) return false
    const payload = this.session.update(pt)
    if (!payload) return false
    const { anchor, row, column } = payload
    const r0 = Math.min(row[0], row[1])
    const r1 = Math.max(row[0], row[1])
    const c0 = Math.min(column[0], column[1])
    const c1 = Math.max(column[0], column[1])
    this.previewSelection = {
      row: [r0, r1],
      column: [c0, c1],
      anchor,
    }
    return true
  }

  cancel(): void {
    this.previewSelection = null
    this.session.cancel()
  }
}

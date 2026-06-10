import {
  SelectDragSession,
  cellPointFromMouse,
  MergeContext,
  type GridLayout,
  type GridMetrics,
} from '@speed-sheet/core'

export type SelectionDragOptions = {
  getCanvas: () => HTMLCanvasElement | undefined
  getLayout: () => GridLayout
  getMetrics: () => GridMetrics
  getMergeContext?: () => MergeContext
  onSelectRange: (
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    anchorR: number,
    anchorC: number,
  ) => void
}

/** Cell pointer + range-drag session (no DOM listeners — caller wires document events). */
export class SelectionDragController {
  private readonly session = new SelectDragSession()

  constructor(private readonly options: SelectionDragOptions) {}

  isActive(): boolean {
    return this.session.active
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
  }

  updateFromEvent(e: MouseEvent): boolean {
    const pt = this.cellPointFromEvent(e)
    if (!pt) return false
    const payload = this.session.update(pt)
    if (!payload) return false
    const { anchor, row, column } = payload
    this.options.onSelectRange(row[0], column[0], row[1], column[1], anchor.r, anchor.c)
    return true
  }

  cancel(): void {
    this.session.cancel()
  }
}

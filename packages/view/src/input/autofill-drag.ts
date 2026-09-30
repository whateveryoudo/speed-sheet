import {
  calcAutofillTarget,
  cellPointFromMouse,
  MergeContext,
  type GridLayout,
  type GridMetrics,
  type Sheet,
  type Selection,
  type AutofillTarget,
} from '@speed-sheet/core'

export interface AutofillDragOptions {
  getCanvas: () => HTMLCanvasElement | undefined
  getLayout: () => GridLayout
  getMetrics: () => GridMetrics
  getMergeContext?: () => MergeContext
  getSheet: () => Sheet | null
}

export class AutofillDragController {
  private active = false
  private sourceRange: { r0: number; c0: number; r1: number; c1: number } | null = null
  private target: AutofillTarget | null = null

  constructor(private readonly options: AutofillDragOptions) {}

  isActive(): boolean {
    return this.active
  }

  getTarget(): AutofillTarget | null {
    return this.target
  }

  getPreviewRange(): { row: [number, number]; column: [number, number] } | null {
    if (!this.active || !this.target) return null
    const { fullRange } = this.target
    return {
      row: [fullRange.r0, fullRange.r1],
      column: [fullRange.c0, fullRange.c1],
    }
  }

  start(selection: Selection): void {
    this.active = true
    const r0 = Math.min(selection.row[0], selection.row[1])
    const r1 = Math.max(selection.row[0], selection.row[1])
    const c0 = Math.min(selection.column[0], selection.column[1])
    const c1 = Math.max(selection.column[0], selection.column[1])
    this.sourceRange = { r0, r1, c0, c1 }
    this.target = null
  }

  updateFromEvent(e: MouseEvent): boolean {
    if (!this.active || !this.sourceRange) return false
    const canvas = this.options.getCanvas()
    if (!canvas) return false

    const pt = cellPointFromMouse(
      e,
      canvas.getBoundingClientRect(),
      this.options.getLayout(),
      this.options.getMetrics(),
      MergeContext.empty(),
    )
    if (!pt) return false

    const newTarget = calcAutofillTarget(this.sourceRange, pt.r, pt.c)
    const prev = this.target
    const changed =
      (!prev && !!newTarget) ||
      (!!prev && !newTarget) ||
      (prev && newTarget && (
        prev.targetRange.r0 !== newTarget.targetRange.r0 ||
        prev.targetRange.r1 !== newTarget.targetRange.r1 ||
        prev.targetRange.c0 !== newTarget.targetRange.c0 ||
        prev.targetRange.c1 !== newTarget.targetRange.c1
      ))

    this.target = newTarget
    return !!changed
  }

  end(): { sourceRange: { r0: number; c0: number; r1: number; c1: number }; target: AutofillTarget } | null {
    if (!this.active || !this.sourceRange || !this.target) {
      this.cancel()
      return null
    }
    const result = {
      sourceRange: this.sourceRange,
      target: this.target,
    }
    this.cancel()
    return result
  }

  cancel(): void {
    this.active = false
    this.sourceRange = null
    this.target = null
  }
}

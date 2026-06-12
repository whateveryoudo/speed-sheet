import {
  resolveCanvasPointerTarget,
  resolvePointerCursor,
  hitCheckboxAt,
  MergeContext,
  type GridLayout,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'
import type { SelectionDragLike } from './document-drag'

export type PointerSelectionDrag = SelectionDragLike & {
  rawCellPointFromEvent: (e: MouseEvent) => { r: number; c: number } | null
  start: (r: number, c: number) => void
  cellPointFromEvent: (e: MouseEvent) => { r: number; c: number } | null
}

export type PointerInlineEdit = {
  isEditingCell: (r: number, c: number) => boolean
  startFormulaPick: (r: number, c: number) => void
}

export type CanvasPointerOptions = {
  getRoot: () => HTMLElement | undefined
  getCanvas: () => HTMLCanvasElement | undefined
  getSheet: () => Sheet | null
  isEditable: () => boolean
  getLayout: () => GridLayout
  getGridMetrics: () => GridMetrics
  isPointerBlocked: () => boolean
  selectionDrag: PointerSelectionDrag
  inlineEdit: PointerInlineEdit
  isFormulaPickMode: () => boolean
  isEditing: () => boolean
  startResizeDrag: (axis: 'row' | 'col', index: number, e: MouseEvent) => void
  startRowMoveDrag: (index: number, e: MouseEvent) => void
  startColMoveDrag: (index: number, e: MouseEvent) => void
  rowMoveDragging?: () => boolean
  colMoveDragging?: () => boolean
  attachPointerListeners: () => void
  endDragSelect: () => void
  closeCtxMenu: () => void
  commitEdit: () => void
  applySelectRange: (
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    anchorR?: number,
    anchorC?: number,
  ) => void
  openEditor: (r: number, c: number, initial?: string) => void
  cellEditInitial: (r: number, c: number) => string
  onCellClick: (r: number, c: number) => void
  onCellDblClick?: (r: number, c: number) => boolean | void
  scheduleDraw: () => void
  hideErrorTip: () => void
  updateErrorTipFromEvent: (e: MouseEvent) => void
  getMergeContext?: () => MergeContext
}

export class CanvasPointerController {
  constructor(private readonly options: CanvasPointerOptions) {}

  private focusRoot(): void {
    this.options.getRoot()?.focus()
  }

  private canvasCoords(e: MouseEvent): { cx: number; cy: number } | null {
    const canvas = this.options.getCanvas()
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      cx: e.clientX - rect.left,
      cy: e.clientY - rect.top,
    }
  }

  private handleHeaderPointerDown(e: MouseEvent): boolean {
    if (!this.options.isEditable()) return false
    const canvas = this.options.getCanvas()
    const coords = this.canvasCoords(e)
    if (!canvas || !coords) return false

    const target = resolveCanvasPointerTarget(
      coords.cx,
      coords.cy,
      this.options.getLayout(),
      this.options.getGridMetrics(),
    )
    if (target.type === 'row-resize') {
      e.preventDefault()
      this.focusRoot()
      this.options.startResizeDrag('row', target.index, e)
      return true
    }
    if (target.type === 'col-resize') {
      e.preventDefault()
      this.focusRoot()
      this.options.startResizeDrag('col', target.index, e)
      return true
    }
    if (target.type === 'row-move') {
      e.preventDefault()
      this.focusRoot()
      canvas.style.cursor = 'grabbing'
      this.options.startRowMoveDrag(target.index, e)
      return true
    }
    if (target.type === 'col-move') {
      e.preventDefault()
      this.focusRoot()
      canvas.style.cursor = 'grabbing'
      this.options.startColMoveDrag(target.index, e)
      return true
    }
    return false
  }

  onCanvasMouseLeave(): void {
    this.options.hideErrorTip()
    if (!this.options.isPointerBlocked()) {
      const canvas = this.options.getCanvas()
      if (canvas) canvas.style.cursor = ''
    }
  }

  onCanvasMouseMove(e: MouseEvent): void {
    if (this.options.isPointerBlocked()) return
    const coords = this.canvasCoords(e)
    const canvas = this.options.getCanvas()
    if (!coords || !canvas) return
    canvas.style.cursor = resolvePointerCursor(
      coords.cx,
      coords.cy,
      this.options.getLayout(),
      this.options.getGridMetrics(),
      {
        rowMoveDragging: this.options.rowMoveDragging?.(),
        colMoveDragging: this.options.colMoveDragging?.(),
      },
    )
    this.options.updateErrorTipFromEvent(e)
  }

  onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return
    this.options.closeCtxMenu()

    if (this.handleHeaderPointerDown(e)) return

    const raw = this.options.selectionDrag.rawCellPointFromEvent(e)
    if (!raw) return
    this.focusRoot()

    const mc = this.options.getMergeContext?.() ?? MergeContext.empty()
    const range = mc.rangeForHit(raw.r, raw.c)
    const { anchor } = range

    if (this.options.isEditable()) {
      const coords = this.canvasCoords(e)
      const s = this.options.getSheet()
      if (coords && s) {
        const rule = s.state.getDataVerification(anchor.r, anchor.c)
        if (
          hitCheckboxAt(
            coords.cx,
            coords.cy,
            anchor.r,
            anchor.c,
            this.options.getLayout(),
            this.options.getGridMetrics(),
            rule,
          )
        ) {
          s.chain().toggleCheckbox({ r: anchor.r, c: anchor.c }).run()
          this.options.scheduleDraw()
          return
        }
      }
    }

    if (this.options.isEditable() && this.options.isFormulaPickMode()) {
      e.preventDefault()
      if (this.options.inlineEdit.isEditingCell(anchor.r, anchor.c)) return
      this.options.inlineEdit.startFormulaPick(anchor.r, anchor.c)
      this.options.attachPointerListeners()
      this.options.scheduleDraw()
      return
    }

    if (this.options.isEditing()) this.options.commitEdit()

    this.options.selectionDrag.start(anchor.r, anchor.c)
    this.options.onCellClick(anchor.r, anchor.c)
    this.options.scheduleDraw()
    this.options.attachPointerListeners()
  }

  onDblClick(e: MouseEvent): void {
    if (!this.options.isEditable()) return
    const pt = this.options.selectionDrag.cellPointFromEvent(e)
    if (!pt) return
    this.options.endDragSelect()
    if (this.options.onCellDblClick?.(pt.r, pt.c)) return
    this.options.openEditor(pt.r, pt.c, this.options.cellEditInitial(pt.r, pt.c))
  }
}

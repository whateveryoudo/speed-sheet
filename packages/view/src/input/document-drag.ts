export type SelectionDragLike = {
  isActive: () => boolean
  cellPointFromEvent: (e: MouseEvent) => { r: number; c: number } | null
  updateFromEvent: (e: MouseEvent) => boolean
  cancel: () => void
}

export type FormulaPickDrag = {
  isFormulaPickDragging: () => boolean
  updateFormulaPick: (pt: { r: number; c: number }) => void
  endFormulaPick: (
    onCell: (r: number, c: number) => void,
    onRange: (r0: number, c0: number, r1: number, c1: number) => void,
  ) => void
}

export type DocumentDragOptions = {
  selectionDrag: SelectionDragLike
  inlineEdit: FormulaPickDrag
  isBlocked: () => boolean
  onDraw: () => void
  onFormulaPick: (r: number, c: number) => void
  onFormulaRangePick: (r0: number, c0: number, r1: number, c1: number) => void
}

/** 框选拖拽 + 公式点选拖拽共用的 document 级 pointer 监听 */
export class DocumentDragController {
  private readonly onDocumentMouseMove = (e: MouseEvent): void => {
    if (this.options.isBlocked()) return

    const pt = this.options.selectionDrag.cellPointFromEvent(e)
    if (!pt) return

    if (this.options.inlineEdit.isFormulaPickDragging()) {
      this.options.inlineEdit.updateFormulaPick(pt)
      return
    }

    if (!this.options.selectionDrag.isActive()) return
    if (this.options.selectionDrag.updateFromEvent(e)) this.options.onDraw()
  }

  private readonly onDocumentMouseUp = (): void => this.endDragSelect()

  constructor(private readonly options: DocumentDragOptions) {}

  endDragSelect(): void {
    if (this.options.inlineEdit.isFormulaPickDragging()) {
      this.options.inlineEdit.endFormulaPick(
        this.options.onFormulaPick,
        this.options.onFormulaRangePick,
      )
    }
    this.options.selectionDrag.cancel()
    document.removeEventListener('mousemove', this.onDocumentMouseMove)
    document.removeEventListener('mouseup', this.onDocumentMouseUp)
    this.options.onDraw()
  }

  attachPointerListeners(): void {
    document.addEventListener('mousemove', this.onDocumentMouseMove)
    document.addEventListener('mouseup', this.onDocumentMouseUp)
  }

  dispose(): void {
    document.removeEventListener('mousemove', this.onDocumentMouseMove)
    document.removeEventListener('mouseup', this.onDocumentMouseUp)
    this.options.selectionDrag.cancel()
  }
}

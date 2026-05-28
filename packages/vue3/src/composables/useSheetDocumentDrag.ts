import type { useSheetSelectionDrag } from './useSheetSelectionDrag'
import type { useSheetInlineEdit } from './useSheetInlineEdit'

type SelectionDrag = ReturnType<typeof useSheetSelectionDrag>
type InlineEdit = ReturnType<typeof useSheetInlineEdit>

/** 框选拖拽 + 公式点选拖拽共用的 document 级 pointer 监听 */
export function useSheetDocumentDrag(options: {
  selectionDrag: SelectionDrag
  inlineEdit: InlineEdit
  isBlocked: () => boolean
  onDraw: () => void
  onFormulaPick: (r: number, c: number) => void
  onFormulaRangePick: (r0: number, c0: number, r1: number, c1: number) => void
}) {
  function onDocumentMouseMove(e: MouseEvent): void {
    if (options.isBlocked()) return

    const pt = options.selectionDrag.cellPointFromEvent(e)
    if (!pt) return

    if (options.inlineEdit.isFormulaPickDragging()) {
      options.inlineEdit.updateFormulaPick(pt)
      return
    }

    if (!options.selectionDrag.isActive()) return
    if (options.selectionDrag.updateFromEvent(e)) options.onDraw()
  }

  function endDragSelect(): void {
    if (options.inlineEdit.isFormulaPickDragging()) {
      options.inlineEdit.endFormulaPick(options.onFormulaPick, options.onFormulaRangePick)
    }
    options.selectionDrag.cancel()
    document.removeEventListener('mousemove', onDocumentMouseMove)
    document.removeEventListener('mouseup', endDragSelect)
    options.onDraw()
  }

  function attachPointerListeners(): void {
    document.addEventListener('mousemove', onDocumentMouseMove)
    document.addEventListener('mouseup', endDragSelect)
  }

  function dispose(): void {
    document.removeEventListener('mousemove', onDocumentMouseMove)
    document.removeEventListener('mouseup', endDragSelect)
    options.selectionDrag.cancel()
  }

  return {
    onDocumentMouseMove,
    endDragSelect,
    attachPointerListeners,
    dispose,
  }
}

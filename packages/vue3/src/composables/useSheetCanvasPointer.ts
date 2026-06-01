import type { Ref, ComputedRef, MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import {
  resolveCanvasPointerTarget,
  resolvePointerCursor,
  hitCheckboxAt,
  MergeContext,
  type GridLayout,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'
import type { useSheetSelectionDrag } from './useSheetSelectionDrag'
import type { useSheetInlineEdit } from './useSheetInlineEdit'

type SelectionDrag = ReturnType<typeof useSheetSelectionDrag>
type InlineEdit = ReturnType<typeof useSheetInlineEdit>

export function useSheetCanvasPointer(options: {
  rootEl: Ref<HTMLElement | undefined>
  canvasEl: Ref<HTMLCanvasElement | undefined>
  sheet: Ref<Sheet | null>
  editable: MaybeRefOrGetter<boolean>
  getLayout: () => GridLayout
  gridMetrics: ComputedRef<GridMetrics>
  isPointerBlocked: () => boolean
  selectionDrag: SelectionDrag
  inlineEdit: InlineEdit
  effectiveFormulaPick: ComputedRef<boolean>
  editing: Ref<boolean>
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
  /** 返回 true 时不打开默认单元格编辑器（如双击编辑下拉配置） */
  onCellDblClick?: (r: number, c: number) => boolean | void
  scheduleDraw: () => void
  hideErrorTip: () => void
  updateErrorTipFromEvent: (e: MouseEvent) => void
  getMergeContext?: () => MergeContext
}) {
  function focusRoot(): void {
    options.rootEl.value?.focus()
  }

  function canvasCoords(e: MouseEvent): { cx: number; cy: number } | null {
    const canvas = options.canvasEl.value
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      cx: e.clientX - rect.left,
      cy: e.clientY - rect.top,
    }
  }

  /** 表头 resize / 行拖拽命中；命中则已处理并返回 true */
  function handleHeaderPointerDown(e: MouseEvent): boolean {
    if (!toValue(options.editable)) return false
    const canvas = options.canvasEl.value
    const coords = canvasCoords(e)
    if (!canvas || !coords) return false

    const target = resolveCanvasPointerTarget(
      coords.cx,
      coords.cy,
      options.getLayout(),
      options.gridMetrics.value,
    )
    if (target.type === 'row-resize') {
      e.preventDefault()
      focusRoot()
      options.startResizeDrag('row', target.index, e)
      return true
    }
    if (target.type === 'col-resize') {
      e.preventDefault()
      focusRoot()
      options.startResizeDrag('col', target.index, e)
      return true
    }
    if (target.type === 'row-move') {
      e.preventDefault()
      focusRoot()
      canvas.style.cursor = 'grabbing'
      options.startRowMoveDrag(target.index, e)
      return true
    }
    if (target.type === 'col-move') {
      e.preventDefault()
      focusRoot()
      canvas.style.cursor = 'grabbing'
      options.startColMoveDrag(target.index, e)
      return true
    }
    return false
  }

  function onCanvasMouseLeave(): void {
    options.hideErrorTip()
    if (!options.isPointerBlocked() && options.canvasEl.value) {
      options.canvasEl.value.style.cursor = ''
    }
  }

  function onCanvasMouseMove(e: MouseEvent): void {
    if (options.isPointerBlocked()) return
    const coords = canvasCoords(e)
    if (!coords) return
    const canvas = options.canvasEl.value!
    canvas.style.cursor = resolvePointerCursor(
      coords.cx,
      coords.cy,
      options.getLayout(),
      options.gridMetrics.value,
      {
        rowMoveDragging: options.rowMoveDragging?.(),
        colMoveDragging: options.colMoveDragging?.(),
      },
    )
    options.updateErrorTipFromEvent(e)
  }

  function onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return
    options.closeCtxMenu()

    if (handleHeaderPointerDown(e)) return

    const raw = options.selectionDrag.rawCellPointFromEvent(e)
    if (!raw) return
    focusRoot()

    const mc = options.getMergeContext?.() ?? MergeContext.empty()
    const range = mc.rangeForHit(raw.r, raw.c)
    const { anchor } = range

    if (toValue(options.editable)) {
      const coords = canvasCoords(e)
      const s = options.sheet.value
      if (coords && s) {
        const rule = s.state.getDataVerification(anchor.r, anchor.c)
        if (
          hitCheckboxAt(
            coords.cx,
            coords.cy,
            anchor.r,
            anchor.c,
            options.getLayout(),
            options.gridMetrics.value,
            rule,
          )
        ) {
          s.chain().toggleCheckbox({ r: anchor.r, c: anchor.c }).run()
          options.scheduleDraw()
          return
        }
      }
    }

    if (toValue(options.editable) && options.effectiveFormulaPick.value) {
      e.preventDefault()
      if (options.inlineEdit.isEditingCell(anchor.r, anchor.c)) return
      options.inlineEdit.startFormulaPick(anchor.r, anchor.c)
      options.attachPointerListeners()
      options.scheduleDraw()
      return
    }

    if (options.editing.value) options.commitEdit()

    options.selectionDrag.start(anchor.r, anchor.c)
    options.applySelectRange(
      range.row[0],
      range.column[0],
      range.row[1],
      range.column[1],
      anchor.r,
      anchor.c,
    )
    options.onCellClick(anchor.r, anchor.c)
    options.scheduleDraw()
    options.attachPointerListeners()
  }

  function onDblClick(e: MouseEvent): void {
    if (!toValue(options.editable)) return
    const pt = options.selectionDrag.cellPointFromEvent(e)
    if (!pt) return
    options.endDragSelect()
    if (options.onCellDblClick?.(pt.r, pt.c)) return
    options.openEditor(pt.r, pt.c, options.cellEditInitial(pt.r, pt.c))
  }

  return {
    onCanvasMouseLeave,
    onCanvasMouseMove,
    onMouseDown,
    onDblClick,
  }
}

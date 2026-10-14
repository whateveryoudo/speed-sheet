import { ref, computed, onMounted, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import {
  MergeContext,
  type Sheet,
  type RenderOptions,
  type CellRange,
  type AutofillDirection,
} from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'
import { SheetViewport, type SheetViewportEditorBridge } from '@speed-sheet/view'
import type { ContextMenuState } from '../types/context-menu'
import { useSheetInlineEdit } from './useSheetInlineEdit'
import type { FormulaEditContext } from './useFormulaEdit'
import type FormulaRichInput from '../components/FormulaRichInput.vue'

/**
 * Vue 胶水：统一视口与内联编辑控制器
 * 封装 SheetViewport 与内联编辑状态机，消除外部的时序死结与闭包桥接
 */
export function useSheetCanvasView(options: {
  rootEl: Ref<HTMLElement | undefined>
  canvasEl: Ref<HTMLCanvasElement | undefined>
  viewportEl: Ref<HTMLElement | undefined>
  scrollEl: Ref<HTMLElement | undefined>
  editorEl: Ref<InstanceType<typeof FormulaRichInput> | null>
  sheet: Ref<Sheet | null>
  revision: Ref<number>
  rowHeaderWidth: Ref<number | undefined>
  columnHeaderHeight: Ref<number | undefined>
  formulaRefRanges: Ref<RenderOptions['formulaRefRanges']>
  editable: ComputedRef<boolean>
  formulaEdit?: FormulaEditContext | null
  commitBoundary?: ComputedRef<HTMLElement | null | undefined> | Ref<HTMLElement | null | undefined>
  formulaPickModeProp?: Ref<boolean> | ComputedRef<boolean>
  hideSelection?: Ref<boolean | undefined> | ComputedRef<boolean | undefined>
  canEditCell?: (r: number, c: number) => boolean
  onEditBlocked?: () => void
  onSelectRange: (
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    anchorR: number,
    anchorC: number,
  ) => void
  onSelectingRange?: (
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    anchorR: number,
    anchorC: number,
  ) => void
  onCellClick: (r: number, c: number) => void
  onCellDblClick?: (r: number, c: number) => boolean | void
  onContextMenu: (payload: ContextMenuState & { close: () => void }) => void
  onFormulaPick: (r: number, c: number) => void
  onFormulaRangePick: (r0: number, c0: number, r1: number, c1: number) => void
  onScrollLayout: () => void
  onFreezeInvalid?: () => void
  onAutofillComplete?: (result: {
    sourceRange: CellRange
    targetRange: CellRange
    direction: AutofillDirection
    originalTargetCells?: Array<{ r: number; c: number; cell: CellAttributes | null }>
  }) => void
  onFindAndReplace?: () => void
}) {
  const bump = ref(0)
  let viewport!: SheetViewport

  // 1. 响应式封装 layout 与 scroll
  const scrollX = computed({
    get: () => {
      void bump.value
      return viewport.layoutState.scrollX
    },
    set: (v) => {
      viewport.layoutState.scrollX = v
      bump.value++
    },
  })
  const scrollY = computed({
    get: () => {
      void bump.value
      return viewport.layoutState.scrollY
    },
    set: (v) => {
      viewport.layoutState.scrollY = v
      bump.value++
    },
  })
  const layout = computed({
    get: () => {
      void bump.value
      return viewport.layoutState.layout
    },
    set: (v) => {
      viewport.layoutState.layout = v
      bump.value++
    },
  })
  const gridMetrics = computed(() => {
    void bump.value
    void options.revision.value
    return viewport.layoutState.gridMetrics
  })
  const totalRows = computed(() => viewport.layoutState.totalRows)
  const totalCols = computed(() => viewport.layoutState.totalCols)
  const totalW = computed(() => viewport.layoutState.totalW)
  const totalH = computed(() => viewport.layoutState.totalH)
  const layoutForHit = () => viewport.layoutState.layoutForHit()

  const sel = computed(() => {
    void options.revision.value
    return viewport.getSelection()
  })
  const cells = computed(() => {
    void options.revision.value
    return options.sheet.value?.state.getAllCells() ?? []
  })
  const activeCell = computed(() => ({
    r: sel.value.anchor?.r ?? sel.value.row[0],
    c: sel.value.anchor?.c ?? sel.value.column[0],
  }))
  const cellEntries = computed(() => {
    void options.revision.value
    return viewport.getCellEntries()
  })

  // 2. 内聚创建 inlineEdit，内部直接消费上述响应式包装
  const inlineEdit = useSheetInlineEdit({
    sheet: options.sheet,
    formulaEdit: options.formulaEdit ?? null,
    editorEl: options.editorEl,
    viewportEl: options.viewportEl,
    rootEl: options.rootEl,
    layout,
    scrollX,
    scrollY,
    cellEntries,
    cells,
    commitBoundary: options.commitBoundary ?? ref(null),
    formulaPickModeProp: options.formulaPickModeProp ?? ref(false),
    onDraw: () => viewport.scheduleDraw(),
    canEditCell: options.canEditCell,
    onEditBlocked: options.onEditBlocked,
  })

  // 3. 构造 editorBridge：方法直接绑定，消除闭包延迟与 ?. 可选链
  const editorBridge: SheetViewportEditorBridge = {
    isEditingCell: inlineEdit.isEditingCell,
    startFormulaPick: inlineEdit.startFormulaPick,
    isFormulaPickDragging: inlineEdit.isFormulaPickDragging,
    updateFormulaPick: inlineEdit.updateFormulaPick,
    endFormulaPick: inlineEdit.endFormulaPick,
    isEditing: () => inlineEdit.editing.value,
    getEditR: () => inlineEdit.editR.value,
    getEditC: () => inlineEdit.editC.value,
    commitEdit: inlineEdit.commitEdit,
    openEditor: inlineEdit.openEditor,
    cellEditInitial: inlineEdit.cellEditInitial,
  }

  // 4. 创建 SheetViewport 实例
  viewport = new SheetViewport({
    getRoot: () => options.rootEl.value,
    getCanvas: () => options.canvasEl.value,
    getViewport: () => options.viewportEl.value,
    getScroll: () => options.scrollEl.value,
    getSheet: () => options.sheet.value,
    getRevision: () => options.revision.value,
    getRowHeaderWidth: () => options.rowHeaderWidth.value,
    getColumnHeaderHeight: () => options.columnHeaderHeight.value,
    getFormulaRefRanges: () => options.formulaRefRanges.value,
    isEditable: () => options.editable.value,
    isFormulaPickMode: () => inlineEdit.effectiveFormulaPick.value,
    getHideSelection: () => !!options.hideSelection?.value,
    editor: editorBridge,
    getMergeContext: () => options.sheet.value?.createMergeContext() ?? MergeContext.empty(),
    onSelectRange: options.onSelectRange,
    onSelectingRange: options.onSelectingRange,
    onCellClick: options.onCellClick,
    onCellDblClick: options.onCellDblClick,
    onContextMenuOpen: options.onContextMenu,
    onFormulaPick: options.onFormulaPick,
    onFormulaRangePick: options.onFormulaRangePick,
    onAutofillComplete: options.onAutofillComplete,
    onFindAndReplace: options.onFindAndReplace,
    onScrollLayout: () => {
      options.onScrollLayout()
      if (inlineEdit.editing.value) {
        inlineEdit.updateEditorWidth()
      }
      viewport.closeCtxMenu()
    },
    onFreezeInvalid: options.onFreezeInvalid,
  })

  viewport.subscribe(() => {
    bump.value++
  })

  const resizeGuide = computed(() => {
    void bump.value
    return viewport.resizeGuide
  })
  const resizeGuideStyle = computed(() => {
    void bump.value
    return viewport.resizeGuideStyle
  })
  const rowMoveGuide = computed(() => {
    void bump.value
    return viewport.rowMoveGuide
  })
  const rowMoveHint = computed(() => {
    void bump.value
    return viewport.rowMoveHint
  })
  const colMoveGuide = computed(() => {
    void bump.value
    return viewport.colMoveGuide
  })
  const colMoveHint = computed(() => {
    void bump.value
    return viewport.colMoveHint
  })
  const errorTip = computed(() => {
    void bump.value
    return viewport.errorTip
  })
  const ctxMenu = computed(() => {
    void bump.value
    return viewport.ctxMenu
  })
  const ctxMenuPayload = computed(() => {
    void bump.value
    return viewport.ctxMenuPayload
  })
  const scrollbar = computed(() => {
    void bump.value
    return viewport.scrollbar
  })
  const scrollbarVisibleX = computed(() => {
    void bump.value
    return viewport.scrollbarVisibleX
  })
  const scrollbarVisibleY = computed(() => {
    void bump.value
    return viewport.scrollbarVisibleY
  })

  watch(
    () => [options.rowHeaderWidth.value, options.columnHeaderHeight.value] as const,
    () => viewport.onHeaderSizesChange(),
  )
  watch(
    () =>
      [
        options.revision.value,
        options.sheet.value,
        inlineEdit.editing.value,
        options.formulaRefRanges.value,
      ] as const,
    () => viewport.onDrawDataChange(),
  )
  watch([totalW, totalH], () => viewport.syncScrollMetrics())

  onMounted(() => viewport.attach())
  onUnmounted(() => viewport.detach())

  return {
    viewport,
    scrollX,
    scrollY,
    layout,
    gridMetrics,
    totalRows,
    totalCols,
    totalW,
    totalH,
    layoutForHit,
    sel,
    cells,
    activeCell,
    cellEntries,
    resizeGuide,
    resizeGuideStyle,
    rowMoveGuide,
    rowMoveHint,
    colMoveGuide,
    colMoveHint,
    errorTip,
    ctxMenu,
    ctxMenuPayload,
    scrollbar,
    scrollbarVisibleX,
    scrollbarVisibleY,
    scheduleDraw: () => viewport.scheduleDraw(),
    closeCtxMenu: () => viewport.closeCtxMenu(),
    handleScroll: viewport.handleScroll,
    onCanvasWheel: viewport.onCanvasWheel,
    onThumbDragStart: viewport.onThumbDragStart,
    onTrackClick: viewport.onTrackClick,
    syncScrollMetrics: viewport.syncScrollMetrics,
    onGutterXEnter: viewport.onGutterXEnter,
    onGutterXLeave: viewport.onGutterXLeave,
    onGutterYEnter: viewport.onGutterYEnter,
    onGutterYLeave: viewport.onGutterYLeave,
    onScrollbarEnter: viewport.onScrollbarEnter,
    onScrollbarLeave: viewport.onScrollbarLeave,
    onKeyDown: viewport.onKeyDown,
    onCanvasMouseLeave: viewport.onCanvasMouseLeave,
    onCanvasMouseMove: viewport.onCanvasMouseMove,
    onPointerMouseDown: viewport.onPointerMouseDown,
    onDblClick: viewport.onDblClick,
    onContextMenu: viewport.onContextMenu,
    scrollToCell: (r: number, c: number) => viewport.scrollToCell(r, c),
    setFindMatches: (matches: Array<{ r: number; c: number }> | null) => viewport.setFindMatches(matches),

    // 内联编辑器响应式状态与交互方法
    editing: inlineEdit.editing,
    editorValue: inlineEdit.editorValue,
    editorStyle: inlineEdit.editorStyle,
    editorFieldStyle: inlineEdit.editorFieldStyle,
    endEditingForLayoutChange: inlineEdit.endEditingForLayoutChange,
    syncEditorCaret: inlineEdit.syncEditorCaret,
    onEditorKeydown: inlineEdit.onEditorKeydown,
    onEditorInput: inlineEdit.onEditorInput,
    onEditorBlur: inlineEdit.onEditorBlur,
    cancelEdit: inlineEdit.cancelEdit,
    commitEdit: inlineEdit.commitEdit,
    effectiveFormulaPick: inlineEdit.effectiveFormulaPick,
  }
}

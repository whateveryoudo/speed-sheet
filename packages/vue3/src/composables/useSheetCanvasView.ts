import { ref, computed, onMounted, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import { MergeContext, type Sheet, type RenderOptions } from '@speed-sheet/core'
import { SheetViewport, type SheetViewportEditorBridge } from '@speed-sheet/view'
import type { ContextMenuState } from '../types/context-menu'

/** Vue 胶水：一个 composable 绑定 SheetViewport，替代原先十几个薄封装 hook */
export function useSheetCanvasView(options: {
  rootEl: Ref<HTMLElement | undefined>
  canvasEl: Ref<HTMLCanvasElement | undefined>
  viewportEl: Ref<HTMLElement | undefined>
  scrollEl: Ref<HTMLElement | undefined>
  sheet: Ref<Sheet | null>
  revision: Ref<number>
  rowHeaderWidth: Ref<number | undefined>
  columnHeaderHeight: Ref<number | undefined>
  formulaRefRanges: Ref<RenderOptions['formulaRefRanges']>
  editable: ComputedRef<boolean>
  isFormulaPickMode: ComputedRef<boolean>
  /** 与 editor 分离，避免 watch 初始化时 editor 尚未就绪 */
  isEditing: () => boolean
  editor: SheetViewportEditorBridge
  onSelectRange: (
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
  onEditorWidthSync?: () => void
}) {
  const bump = ref(0)
  const viewport = new SheetViewport({
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
    isFormulaPickMode: () => options.isFormulaPickMode.value,
    editor: options.editor,
    getMergeContext: () => options.sheet.value?.createMergeContext() ?? MergeContext.empty(),
    onSelectRange: options.onSelectRange,
    onCellClick: options.onCellClick,
    onCellDblClick: options.onCellDblClick,
    onContextMenuOpen: options.onContextMenu,
    onFormulaPick: options.onFormulaPick,
    onFormulaRangePick: options.onFormulaRangePick,
    onScrollLayout: () => {
      options.onScrollLayout()
      options.onEditorWidthSync?.()
      viewport.closeCtxMenu()
    },
    onFreezeInvalid: options.onFreezeInvalid,
  })

  viewport.subscribe(() => {
    bump.value++
  })

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
        options.isEditing(),
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
  }
}

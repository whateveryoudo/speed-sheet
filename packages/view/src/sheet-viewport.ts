import { MergeContext, type GridLayout, type CellEntry, type Sheet, type RenderOptions } from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'
import { Subscribable } from './utils/subscribe'
import { SheetLayoutState } from './layout/sheet-layout'
import { CanvasDrawController } from './draw/canvas-draw'
import { ScrollBarController } from './scroll/scroll-bar'
import {
  getSheetSelection,
  getSheetCells,
  toCellEntries,
} from './data/canvas-data'
import { SelectionDragController } from './input/selection-drag'
import { ResizeDragController, type ResizeGuideState } from './input/resize-drag'
import { RowMoveController, type MoveGuideState, type MoveHintState } from './input/row-move'
import { ColMoveController } from './input/col-move'
import { DocumentDragController, type FormulaPickDrag } from './input/document-drag'
import { ContextMenuController, type ContextMenuState } from './input/context-menu'
import { CellErrorTipController, type CellErrorTipState } from './overlay/cell-error-tip'
import { CanvasPointerController, type PointerInlineEdit } from './input/canvas-pointer'
import { KeyboardController } from './input/keyboard'
import type { SheetScrollbarUi } from './types'

export type SheetViewportEditorBridge = PointerInlineEdit &
  FormulaPickDrag & {
    isEditing: () => boolean
    getEditR: () => number
    getEditC: () => number
    commitEdit: () => void
    openEditor: (r: number, c: number, initial?: string) => void
    cellEditInitial: (r: number, c: number) => string
  }

export type SheetViewportOptions = {
  getRoot: () => HTMLElement | undefined
  getCanvas: () => HTMLCanvasElement | undefined
  getViewport: () => HTMLElement | undefined
  getScroll: () => HTMLElement | undefined
  getSheet: () => Sheet | null
  getRevision: () => number
  getRowHeaderWidth: () => number | undefined
  getColumnHeaderHeight: () => number | undefined
  getFormulaRefRanges: () => RenderOptions['formulaRefRanges']
  isEditable: () => boolean
  isFormulaPickMode: () => boolean
  editor: SheetViewportEditorBridge
  getMergeContext?: () => MergeContext
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
  onContextMenuOpen: (payload: Omit<ContextMenuState, 'show'> & { close: () => void }) => void
  onFormulaPick: (r: number, c: number) => void
  onFormulaRangePick: (r0: number, c0: number, r1: number, c1: number) => void
  onScrollLayout: () => void
  onFreezeInvalid?: () => void
}

export class SheetViewport extends Subscribable {
  readonly layoutState: SheetLayoutState

  resizeGuide: ResizeGuideState = { active: false, axis: 'row', pos: 0 }
  rowMoveGuide: MoveGuideState = { active: false, pos: 0 }
  rowMoveHint: MoveHintState = { show: false, x: 0, y: 0, text: '' }
  colMoveGuide: MoveGuideState = { active: false, pos: 0 }
  colMoveHint: MoveHintState = { show: false, x: 0, y: 0, text: '' }
  errorTip: CellErrorTipState = { show: false, x: 0, y: 0, message: '' }

  private readonly draw: CanvasDrawController
  readonly scroll: ScrollBarController
  private readonly selectionDrag: SelectionDragController
  private readonly resizeDrag: ResizeDragController
  private readonly rowMove: RowMoveController
  private readonly colMove: ColMoveController
  private readonly documentDrag: DocumentDragController
  private readonly contextMenu: ContextMenuController
  private readonly errorTipCtrl: CellErrorTipController
  private readonly pointer: CanvasPointerController
  private readonly keyboard: KeyboardController

  constructor(private readonly options: SheetViewportOptions) {
    super()

    this.layoutState = new SheetLayoutState({
      getSheet: options.getSheet,
      getRevision: options.getRevision,
      getRowHeaderWidth: options.getRowHeaderWidth,
      getColumnHeaderHeight: options.getColumnHeaderHeight,
    })

    const layoutForHit = () => this.layoutState.layoutForHit()
    const getMetrics = () => this.layoutState.gridMetrics
    const bump = () => this.notify()
    const scheduleDraw = () => this.draw.scheduleDraw()

    this.selectionDrag = new SelectionDragController({
      getCanvas: options.getCanvas,
      getLayout: layoutForHit,
      getMetrics,
      getMergeContext: options.getMergeContext,
      onSelectRange: options.onSelectRange,
    })

    this.resizeDrag = new ResizeDragController({
      getCanvas: options.getCanvas,
      getLayout: layoutForHit,
      getMetrics,
      getSheet: options.getSheet,
      onDraw: scheduleDraw,
      onGuideChange: (g) => {
        this.resizeGuide = g
        bump()
      },
    })

    this.rowMove = new RowMoveController({
      getCanvas: options.getCanvas,
      getViewport: options.getViewport,
      getLayout: layoutForHit,
      getMetrics,
      getSheet: options.getSheet,
      onDraw: scheduleDraw,
      onGuideChange: (g) => {
        this.rowMoveGuide = g
        bump()
      },
      onHintChange: (h) => {
        this.rowMoveHint = h
        bump()
      },
    })

    this.colMove = new ColMoveController({
      getCanvas: options.getCanvas,
      getViewport: options.getViewport,
      getLayout: layoutForHit,
      getMetrics,
      getSheet: options.getSheet,
      onDraw: scheduleDraw,
      onGuideChange: (g) => {
        this.colMoveGuide = g
        bump()
      },
      onHintChange: (h) => {
        this.colMoveHint = h
        bump()
      },
    })

    const isPointerBlocked = () =>
      !options.isEditable() ||
      this.resizeDrag.isActive() ||
      this.rowMove.isActive() ||
      this.colMove.isActive()

    this.documentDrag = new DocumentDragController({
      selectionDrag: this.selectionDrag,
      inlineEdit: options.editor,
      isBlocked: isPointerBlocked,
      onDraw: scheduleDraw,
      onFormulaPick: options.onFormulaPick,
      onFormulaRangePick: options.onFormulaRangePick,
    })

    this.contextMenu = new ContextMenuController({
      getCanvas: options.getCanvas,
      isEditable: options.isEditable,
      getLayout: layoutForHit,
      getMetrics,
      getSelection: () => this.getSelection(),
      getSheet: options.getSheet,
      onCellClick: options.onCellClick,
      onDraw: scheduleDraw,
      onContextMenuOpen: options.onContextMenuOpen,
      endDragSelect: () => this.documentDrag.endDragSelect(),
    })
    this.contextMenu.subscribe(() => bump())

    this.errorTipCtrl = new CellErrorTipController({
      getViewport: options.getViewport,
      getCells: () => getSheetCells(options.getSheet(), options.getRevision()),
      cellPointFromEvent: (e) => this.selectionDrag.cellPointFromEvent(e),
    })
    this.errorTipCtrl.subscribe(() => {
      this.errorTip = this.errorTipCtrl.state
      bump()
    })

    this.draw = new CanvasDrawController({
      getCanvas: options.getCanvas,
      getScrollEl: options.getScroll,
      getViewportEl: options.getViewport,
      getSheet: options.getSheet,
      getLayout: () => this.layoutState.layout,
      setLayout: (layout) => {
        this.layoutState.layout = layout
        bump()
      },
      getScrollX: () => this.layoutState.scrollX,
      setScrollX: (x) => {
        this.layoutState.scrollX = x
        bump()
      },
      getScrollY: () => this.layoutState.scrollY,
      setScrollY: (y) => {
        this.layoutState.scrollY = y
        bump()
      },
      getGridMetrics: getMetrics,
      getCellEntries: () => this.getCellEntries(),
      getSelection: () => this.getSelection(),
      isSelecting: () => this.selectionDrag.isActive(),
      isEditing: () => options.editor.isEditing(),
      getEditR: () => options.editor.getEditR(),
      getEditC: () => options.editor.getEditC(),
      getFormulaRefRanges: options.getFormulaRefRanges,
      getRevision: options.getRevision,
      getRowHeaderWidth: options.getRowHeaderWidth,
      getColumnHeaderHeight: options.getColumnHeaderHeight,
      onScrollLayout: options.onScrollLayout,
      onFreezeInvalid: options.onFreezeInvalid,
    })

    this.scroll = new ScrollBarController({
      getScrollEl: options.getScroll,
      getViewportEl: options.getViewport,
      getRowHeaderWidth: options.getRowHeaderWidth,
      getColumnHeaderHeight: options.getColumnHeaderHeight,
      onScroll: () => this.draw.onScroll(),
    })
    this.scroll.subscribe(() => bump())

    const applySelectRange = (
      r0: number,
      c0: number,
      r1: number,
      c1: number,
      anchorR?: number,
      anchorC?: number,
    ) => {
      const ar = anchorR ?? r0
      const ac = anchorC ?? c0
      options.getSheet()
        ?.chain()
        .selectRange({ row: [r0, r1], column: [c0, c1], anchor: { r: ar, c: ac } })
        .run()
      options.onSelectRange(r0, c0, r1, c1, ar, ac)
    }

    this.pointer = new CanvasPointerController({
      getRoot: options.getRoot,
      getCanvas: options.getCanvas,
      getSheet: options.getSheet,
      isEditable: options.isEditable,
      getLayout: layoutForHit,
      getGridMetrics: getMetrics,
      isPointerBlocked,
      selectionDrag: this.selectionDrag,
      inlineEdit: options.editor,
      isFormulaPickMode: options.isFormulaPickMode,
      isEditing: () => options.editor.isEditing(),
      startResizeDrag: (axis, index, e) => this.resizeDrag.start(axis, index, e),
      startRowMoveDrag: (index, e) => this.rowMove.start(index, e),
      startColMoveDrag: (index, e) => this.colMove.start(index, e),
      rowMoveDragging: () => this.rowMove.isActive(),
      colMoveDragging: () => this.colMove.isActive(),
      attachPointerListeners: () => this.documentDrag.attachPointerListeners(),
      endDragSelect: () => this.documentDrag.endDragSelect(),
      closeCtxMenu: () => this.contextMenu.close(),
      commitEdit: () => options.editor.commitEdit(),
      applySelectRange,
      openEditor: options.editor.openEditor,
      cellEditInitial: options.editor.cellEditInitial,
      onCellClick: options.onCellClick,
      onCellDblClick: options.onCellDblClick,
      scheduleDraw,
      hideErrorTip: () => this.errorTipCtrl.hide(),
      updateErrorTipFromEvent: (e) => this.errorTipCtrl.updateFromMouseEvent(e),
      getMergeContext: options.getMergeContext,
    })

    this.keyboard = new KeyboardController({
      getSheet: options.getSheet,
      isEditable: options.isEditable,
      isEditing: () => options.editor.isEditing(),
      getActiveCell: () => {
        const sel = this.getSelection()
        return {
          r: sel.anchor?.r ?? sel.row[0],
          c: sel.anchor?.c ?? sel.column[0],
        }
      },
      getTotalRows: () => this.layoutState.totalRows,
      getTotalCols: () => this.layoutState.totalCols,
      openEditor: options.editor.openEditor,
      cellEditInitial: options.editor.cellEditInitial,
      applySelectRange,
      onCellClick: options.onCellClick,
      onDraw: scheduleDraw,
    })
  }

  getSelection(): Selection {
    return getSheetSelection(this.options.getSheet(), this.options.getRevision())
  }

  getCellEntries(): CellEntry[] {
    return toCellEntries(getSheetCells(this.options.getSheet(), this.options.getRevision()))
  }

  get resizeGuideStyle() {
    return this.resizeDrag.getGuideStyle()
  }

  get ctxMenu(): ContextMenuState {
    return this.contextMenu.state
  }

  get ctxMenuPayload() {
    return this.contextMenu.payload
  }

  get scrollbar(): SheetScrollbarUi {
    return this.scroll.computeScrollbar()
  }

  get scrollbarVisibleX(): boolean {
    return this.scroll.scrollbarVisibleX
  }

  get scrollbarVisibleY(): boolean {
    return this.scroll.scrollbarVisibleY
  }

  scheduleDraw(): void {
    this.draw.scheduleDraw()
  }

  onHeaderSizesChange(): void {
    this.draw.onHeaderSizesChange()
  }

  onDrawDataChange(): void {
    this.draw.onDataChange()
  }

  attach(): void {
    this.draw.attach()
    this.scroll.attach()
  }

  detach(): void {
    this.documentDrag.dispose()
    this.resizeDrag.dispose()
    this.rowMove.dispose()
    this.colMove.dispose()
    this.draw.detach()
    this.scroll.detach()
  }

  // —— scroll / draw ——
  handleScroll = (): void => this.scroll.handleScroll()
  onCanvasWheel = (e: WheelEvent): void => this.scroll.onCanvasWheel(e)
  onThumbDragStart = (axis: 'x' | 'y', e: MouseEvent): void => this.scroll.onThumbDragStart(axis, e)
  onTrackClick = (axis: 'x' | 'y', e: MouseEvent): void => this.scroll.onTrackClick(axis, e)
  syncScrollMetrics = (): void => this.scroll.syncScrollMetrics()
  onGutterXEnter = (): void => this.scroll.onGutterXEnter()
  onGutterXLeave = (): void => this.scroll.onGutterXLeave()
  onGutterYEnter = (): void => this.scroll.onGutterYEnter()
  onGutterYLeave = (): void => this.scroll.onGutterYLeave()
  onScrollbarEnter = (): void => this.scroll.onScrollbarEnter()
  onScrollbarLeave = (): void => this.scroll.onScrollbarLeave()

  // —— pointer ——
  onCanvasMouseLeave = (): void => this.pointer.onCanvasMouseLeave()
  onCanvasMouseMove = (e: MouseEvent): void => this.pointer.onCanvasMouseMove(e)
  onPointerMouseDown = (e: MouseEvent): void => this.pointer.onMouseDown(e)
  onDblClick = (e: MouseEvent): void => this.pointer.onDblClick(e)

  // —— keyboard / menu ——
  onKeyDown = (e: KeyboardEvent): void => this.keyboard.onKeyDown(e)
  onContextMenu = (e: MouseEvent): void => this.contextMenu.onContextMenu(e)
  closeCtxMenu = (): void => this.contextMenu.close()
}

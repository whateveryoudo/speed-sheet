// @speed-sheet/core — Headless spreadsheet engine
//
// Usage:
//   import { Sheet, Extension } from '@speed-sheet/core'
//
//   const sheet = new Sheet({
//     snapshot: workbookSnapshot,
//     extensions: [FilterExtension],
//   })
//
//   sheet.chain().selectCell({ r: 0, c: 0 }).run()
//   sheet.toSnapshot()

export { Sheet } from './Sheet'
export type { SheetOptions, LuckysheetRange, FilterViewState } from './Sheet'

export {
  createDefaultWorkbookSnapshot,
  createDefaultDocumentContent,
} from './persistence/default-document'
export type {
  CreateDefaultDocumentContentOptions,
  DefaultDocumentContent,
} from './persistence/default-document'

export {
  Extension,
  KeyboardExtension,
  SelectionExtension,
  HistoryExtension,
  ClipboardExtension,
  CellEditingExtension,
  RowColExtension,
  CORE_EXTENSIONS,
} from './extension'
export type {
  ExtensionConfig,
  CommandFn,
  CommandContext,
  CommandChain,
  ExtensionCommandContext,
} from './extension'

export { CommandManager } from './commands/CommandManager'
export { SheetState } from './state/SheetState'
export { clearCellRichContent, cellHasRichContent } from './state/cell-rich-content'

export { YOriginUser, YOriginSystem } from './yjs/origins'
export { transact, transactUser, transactSystem } from './yjs/transact'
export {
  createSheetUndoManager,
  getSheetUndoManager,
  canUndoSheet,
  canRedoSheet,
  DEFAULT_UNDO_CAPTURE_MS,
} from './yjs/undo-manager'
export type { SheetHistoryStorage } from './yjs/undo-manager'
export {
  ensureLayoutOnSheet,
  initLayoutFromRcEntries,
  buildIdIndexes,
} from './state/sheet-layout'

export {
  importFromLuckysheet,
  exportToLuckysheet,
  luckysheetFileToSnapshot,
} from './adapter/luckysheet-adapter'

// Renderer
export { renderSheet, cellFromPoint, cellRect, colToLetter, defaultLayout, getVisibleRange, CELL_SELECTION_INSET, CELL_EDITOR_OUTSET, drawCellText, truncateTextToWidth, buildCellMap, cellFontString, getCellTextColSpan, computeEditorWidth, computeSheetImageDisplaySize, computeSheetImageViewportRect, fitImageToCell, resolveSheetImageOriginSize, SHEET_IMAGE_CELL_INSET } from './renderer/canvas'
export type { SheetImageViewportRect } from './renderer/canvas'
export type { GridLayout } from './renderer/grid-layout'
export { buildGridMetrics, MIN_ROW_HEIGHT, MIN_COL_WIDTH } from './renderer/grid-metrics'
export type { GridMetrics } from './renderer/grid-metrics'
export { buildSheetGridMetrics } from './renderer/sheet-grid-metrics'
export {
  selectionFreezeTarget,
  validateFreezeInViewport,
  validateExistingFreezeInViewport,
  isFreezeActive,
  freezeSplitsFromTarget,
  frozenRowPixelHeight,
  frozenColPixelWidth,
} from './freeze/freeze-utils'
export type { FreezeMode, FreezeValidationResult, FreezeValidationReason, FreezeViewportInput } from './freeze/freeze-utils'
export {
  MergeContext,
  buildMergeLookup,
  selectionDisplayBounds,
  selectionRangeForMergeHit,
  mergePixelRect,
  focusPixelRect,
  resolveMergeAnchor,
} from './merge'
export type { MergeHitRange, MergeDisplayBounds, MergeLookup } from './merge'
export { hitRowResizeHandle, hitColResizeHandle } from './renderer/resize-hit'
export {
  hitRowHeader,
  rowMoveInsertIndex,
  rowMoveGuideCanvasY,
  mapRowIndexAfterMove,
} from './renderer/row-move-hit'
export {
  hitColHeader,
  colMoveInsertIndex,
  colMoveGuideCanvasX,
  mapColIndexAfterMove,
} from './renderer/col-move-hit'
export {
  pointerFromCanvasCoords,
  pointerFromMouseEvent,
  resolveMoveRowBlock,
  resolveMoveColBlock,
  resolveResizeRows,
  resolveResizeCols,
  ResizeSession,
  RowMoveSession,
  ColMoveSession,
  SelectDragSession,
  buildSelectionAfterRowMove,
  buildSelectionAfterColMove,
  rowMoveHintText,
  colMoveHintText,
  computeRowHeightFromPointer,
  computeColWidthFromPointer,
  rowResizeGuidePos,
  colResizeGuidePos,
  resolveCanvasPointerTarget,
  resolvePointerCursor,
  clampCellCoords,
  cellPointFromCanvasPointer,
  cellPointFromMouse,
  pointInSelection,
  isMultiCellSelection,
  resolveContextMenuHit,
  selectRangeFromContextAction,
  isPrintableKey,
  resolveKeyboardNav,
  hitCheckboxAt,
  hitNoteMarkerAt,
  drawNoteMarker,
  drawNoteMarkersInView,
} from './interaction'
export type {
  CanvasPointer,
  RowMoveBlock,
  ResizeAxis,
  ResizePreview,
  ResizeCommit,
  RowResizeCommit,
  ColResizeCommit,
  RowMovePreview,
  RowMoveCommit,
  CanvasPointerTarget,
  PointerCursor,
  CellPoint,
  SelectRangePayload,
  ContextMenuTarget,
  ContextMenuAction,
  ContextMenuHitResult,
  ContextMenuPointer,
  KeyboardNavResult,
} from './interaction'
export type { CellEntry, RenderOptions, DrawCellTextOptions } from './renderer/canvas'

// Re-export shared types for convenience
export type {
  CellAttributes,
  CellStyle,
  CellFormat,
  MergeRange,
  BorderInfo,
  BorderSegment,
  FilterCriteria,
  FreezeState,
  SheetConfig,
  SheetSnapshot,
  WorkbookSnapshot,
  LuckysheetFile,
  LuckysheetSheet,
  LuckysheetCell,
  Selection,
  ExtensionMeta,
} from '@speed-sheet/shared'
export {
  cellIdKey,
  parseCellIdKey,
  depKey,
  parseDepKey,
  CELL_ID_SEP,
  allocRowId,
  allocColId,
  ROW_ID_PREFIX,
  COL_ID_PREFIX,
  AXIS_NANOID_SIZE,
  isRowId,
  isColId,
} from '@speed-sheet/shared'

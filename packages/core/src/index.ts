// @speed-sheet/core — Headless spreadsheet engine
//
// Usage:
//   import { Sheet, Extension } from '@speed-sheet/core'
//
//   const sheet = new Sheet({
//     data: oldLuckysheetFile,
//     extensions: [FilterExtension],
//   })
//
//   sheet.chain().selectCell({ r: 0, c: 0 }).run()
//   sheet.toLuckysheetFile()

export { Sheet } from './Sheet'
export type { SheetOptions, LuckysheetRange } from './Sheet'

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
export {
  ensureLayoutOnSheet,
  initLayoutFromRcEntries,
  buildIdIndexes,
} from './state/sheet-layout'

export { importFromLuckysheet, exportToLuckysheet } from './adapter/luckysheet-adapter'

// Renderer
export { renderSheet, cellFromPoint, cellRect, colToLetter, defaultLayout, getVisibleRange, CELL_SELECTION_INSET, CELL_EDITOR_OUTSET, drawCellText, truncateTextToWidth, buildCellMap, cellFontString, getCellTextColSpan, computeEditorWidth } from './renderer/canvas-renderer'
export type { GridLayout, CellEntry, RenderOptions, DrawCellTextOptions } from './renderer/canvas-renderer'

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

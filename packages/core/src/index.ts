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
export type { SheetOptions } from './Sheet'

export {
  Extension,
  KeyboardExtension,
  SelectionExtension,
  HistoryExtension,
  ClipboardExtension,
  CellEditingExtension,
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

export { importFromLuckysheet, exportToLuckysheet } from './adapter/luckysheet-adapter'

// Renderer
export { renderSheet, cellFromPoint, cellRect, colToLetter, defaultLayout, getVisibleRange } from './renderer/canvas-renderer'
export type { GridLayout, CellEntry, RenderOptions } from './renderer/canvas-renderer'

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
export { cellKey, parseCellKey, rowKey, colKey, parseRowKey, parseColKey } from '@speed-sheet/shared'

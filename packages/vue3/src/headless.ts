// Headless Vue3 bindings — no ant-design-vue
export { useSheet } from './composables/useSheet'
export type { UseSheetReturn } from './composables/useSheet'
export { useSheetSelection } from './composables/useSheetSelection'

export { default as SheetCanvas } from './components/SheetCanvas.vue'


export type { ContextMenuState, ContextMenuCloseFn } from './types/context-menu'
export {
  Sheet,
  Extension,
  CommandManager,
  SheetState,
  renderSheet,
  cellFromPoint,
  cellRect,
  colToLetter,
  defaultLayout,
  getVisibleRange,
  importFromLuckysheet,
  exportToLuckysheet,
  cellKey,
  parseCellKey,
} from '@speed-sheet/core'

export type {
  SheetOptions,
  ExtensionConfig,
  CellAttributes,
  CellStyle,
  CellFormat,
  MergeRange,
  WorkbookSnapshot,
  SheetSnapshot,
  LuckysheetFile,
  Selection,
  GridLayout,
  CellEntry,
  RenderOptions,
} from '@speed-sheet/core'

export type { WorkbookConfig } from '@speed-sheet/shared'

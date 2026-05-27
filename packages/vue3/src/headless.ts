// Headless Vue3 bindings — no ant-design-vue
export { useSheet } from './composables/useSheet'
export type { UseSheetReturn } from './composables/useSheet'
export { useSheetSelection } from './composables/useSheetSelection'
export {
  provideFormulaEdit,
  useFormulaEdit,
  useFormulaEditOptional,
  FORMULA_EDIT_KEY,
} from './composables/useFormulaEdit'
export type { FormulaEditContext, FormulaRangeHighlight } from './composables/useFormulaEdit'
/** 公式编辑字符串工具 — 实现在 @speed-sheet/extension-formula，此处 re-export 保持对外 API 稳定 */
export {
  isFormulaInput,
  isFormulaText,
  patchFormulaWithRef,
  formatRangeA1,
  buildSheetRefToken,
  getCellFormulaInitial,
} from '@speed-sheet/extension-formula'
export { useFormulaCanvas } from './composables/useFormulaCanvas'
export type { FormulaRefRange } from './composables/useFormulaCanvas'
export {
  mergeBuiltinExtensions,
  resolveSheetOptions,
  hasFormulaExtension,
  BUILTIN_FORMULA_EXTENSION_NAME,
} from './composables/sheetBuiltin'
export type { UseSheetOptions } from './composables/sheetBuiltin'
export { FormulaExtension } from '@speed-sheet/extension-formula'
export {
  useYMapKey,
  useYMapKeys,
  useSheetYMap,
  useYDocMap,
  resolveYMapEntry,
  attachYMapObserver,
} from './composables/yjs'
export type {
  UseYMapKeyOptions,
  UseYMapKeysOptions,
  SheetYMapFields,
  SheetYMapPick,
  YMapLike,
  YMapObserverHandle,
} from './composables/yjs'

export { default as SheetCanvas } from './components/SheetCanvas.vue'
export { default as FormulaRichInput } from './components/FormulaRichInput.vue'


export type { ContextMenuState, ContextMenuCloseFn, ContextMenuTarget } from './types/context-menu'
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
  cellIdKey,
  parseCellIdKey,
  depKey,
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

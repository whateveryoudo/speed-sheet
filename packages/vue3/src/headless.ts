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
export {
  provideSheetEditor,
  useSheetEditor,
  useSheetEditorOptional,
  SHEET_EDITOR_KEY,
} from './composables/useSheetEditorContext'
export type { SheetEditorContext } from './composables/useSheetEditorContext'
export type { FormulaEditContext, FormulaRangeHighlight } from './composables/useFormulaEdit'
/** 公式编辑字符串工具 — 实现在 @speed-sheet/extension-formula，此处 re-export 保持对外 API 稳定 */
export {
  isFormulaInput,
  isFormulaText,
  patchFormulaWithRef,
  formatRangeA1,
  buildSheetRefToken,
  getCellFormulaInitial,
  canPickFormulaRef,
  canPickFormulaRefAtCaret,
} from '@speed-sheet/extension-formula'
export { useFormulaCanvas } from './composables/useFormulaCanvas'
export type { FormulaRefRange } from './composables/useFormulaCanvas'
export {
  mergeBuiltinExtensions,
  resolveSheetOptions,
  hasFormulaExtension,
  extensionName,
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
export { default as SheetExtensionViews } from './components/SheetExtensionViews.vue'
export { default as SheetBubbleMenusHost } from './components/SheetBubbleMenusHost.vue'
export { default as SheetBubbleMenu } from './components/SheetBubbleMenu.vue'
export { VueSheetOverlayRenderer } from './VueSheetOverlayRenderer'
export type { SheetOverlayViewProps } from './VueSheetOverlayRenderer'
export { VueSheetBubbleRenderer } from './VueSheetBubbleRenderer'
export type { SheetBubbleViewProps } from './VueSheetBubbleRenderer'
export {
  useSheetBubbleFloating,
  type SheetBubbleAnchorRect,
} from './composables/useSheetBubbleFloating'
export {
  provideSheetViewport,
  useSheetViewport,
  useSheetViewportOptional,
  SHEET_VIEWPORT_KEY,
} from './composables/useSheetViewportContext'
export type { SheetViewportContext } from './composables/useSheetViewportContext'
export {
  provideSheetUpload,
  useSheetUploadConfig,
  SHEET_UPLOAD_KEY,
} from './composables/useSheetUploadContext'
export type { SheetUploadConfig, SheetUploadApis } from './composables/useSheetUploadContext'
export {
  setSpeedSheetGlobalConfig,
  provideSpeedSheetGlobalConfig,
  useSpeedSheetGlobalConfig,
  resolveSheetUploadConfig,
  SPEED_SHEET_GLOBAL_CONFIG_KEY,
} from './composables/useSheetGlobalConfig'
export type { SpeedSheetGlobalConfig } from './composables/useSheetGlobalConfig'
export { useSheetFileInsert } from './composables/useSheetFileInsert'


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
  CellAttachmentMeta,
  DataVerificationRule,
  SheetImageItem,
} from '@speed-sheet/shared'

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

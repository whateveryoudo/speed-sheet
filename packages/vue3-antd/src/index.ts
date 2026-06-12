// @speed-sheet/vue3-antd — Ant Design UI + speed-components-ui + SpeedSheet

export { installSpeedSheetUi, setSpeedSheetGlobalConfig } from './install'
export type { SpeedSheetUiInstallOptions, SpeedSheetGlobalConfig } from './install'

export { sheetI18n, normalizeSheetLocale, setSheetLocale } from './i18n'
export type { SheetLocale, SheetT } from './i18n'
export { useSheetLocale } from './composables/useSheetLocale'
export { useSpeedSheetProvider } from './composables/useSpeedSheetProvider'
export { useSpeedSheet } from './composables/useSpeedSheet'
export type { SpeedSheetContext } from './composables/useSpeedSheet'
export type { SpeedSheetProviderOptions } from './composables/useSpeedSheetProvider'
export { SheetPreviewImage } from './helpers/sheetPreviewImage'
export { getShortcutTipByKey, SHORTCUTS } from './helpers/registKeyMap'
export type { ShortcutKey } from './helpers/registKeyMap'

export { default as SpeedSheet } from './SpeedSheet.vue'
export { SheetImage, useSheetImageInsert } from './extensions/image'
export { BubbleContainer } from './bubbleMenus'
export {
  mergeSpeedSheetExtensions,
  hasSheetImageExtension,
  hasSheetDropdownExtension,
  hasSheetLinkExtension,
  hasSheetNoteExtension,
  hasSheetFilterExtension,
  hasSheetProtectionExtension,
} from './composables/sheetBuiltin'
export { defaultInsertMenuKeys } from './menus/insert/keys'
export type { InsertMenuConfig, InsertMenuItemConfig } from './menus/insert/types'
export { SheetDropdown, DROPDOWN_EXTENSION_NAME } from './extensions/dropdown'
export { SheetLink, LINK_EXTENSION_NAME } from './extensions/link'
export { SheetNote, NOTE_EXTENSION_NAME } from './extensions/note'
export { SheetFilter, FILTER_EXTENSION_NAME } from './extensions/filter'
export { SheetProtection, PROTECTION_EXTENSION_NAME } from './extensions/protection'

/** 内置公式能力（headless，见 @speed-sheet/vue3） */
export {
  provideFormulaEdit,
  useFormulaEdit,
  useFormulaEditOptional,
  useFormulaCanvas,
  mergeBuiltinExtensions,
  FormulaExtension,
} from '@speed-sheet/vue3'
export type { FormulaEditContext, FormulaRangeHighlight, UseSheetOptions } from '@speed-sheet/vue3'

export {
  Toolbar,
  SheetToolbarMenuBar,
  CellContextMenu,
  defaultCellContextMenuKeys,
  defaultSheetToolbarKeys,
  contextMenuActions,
  resolveContextMenuKeys,
  processContextMenuKeys,
  runContextMenuAction,
} from './menus'
export type { ToolbarItemConfig, ContextMenuActionContext } from './menus'

export type { WorkbookConfig } from '@speed-sheet/shared'
export type {
  SpeedSheetProps,
  ContextMenuItemConfig,
} from './types'
import './style/base.less'
import './style/common.less'
// 导入 UnoCSS 样式
import 'uno.css'
import { installSpeedSheetUi } from './install'

export default {
  install: installSpeedSheetUi,
  version: '0.1.0',
}

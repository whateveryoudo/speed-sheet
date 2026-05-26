// @speed-sheet/vue3-antd — Ant Design UI + speed-components-ui + SpeedSheet

export { installSpeedSheetUi } from './install'
export type { SpeedSheetUiInstallOptions } from './install'

export { sheetI18n, normalizeSheetLocale, setSheetLocale } from './i18n'
export type { SheetLocale, SheetT } from './i18n'
export { useSheetLocale } from './composables/useSheetLocale'
export { getShortcutTipByKey, SHORTCUTS } from './helpers/registKeyMap'
export type { ShortcutKey } from './helpers/registKeyMap'

export { default as SpeedSheet } from './SpeedSheet.vue'

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

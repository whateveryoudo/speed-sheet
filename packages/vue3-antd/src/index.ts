// @speed-sheet/vue3-antd — Ant Design UI + speed-components-ui + SpeedSheet

export { installSpeedSheetUi } from './install'
export type { SpeedSheetUiInstallOptions } from './install'

export { default as SpeedSheet } from './SpeedSheet.vue'

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

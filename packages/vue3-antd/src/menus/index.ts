/** 菜单模块统一导出：工具栏 + 右键菜单 */

export { default as Toolbar } from './toolbar/index'
export { default as SheetToolbarMenuBar } from './toolbar/index'
export { defaultSheetToolbarKeys } from './toolbar/keys'
export type { ToolbarItemConfig } from './toolbar/types'

export { default as CellContextMenu } from './contextMenu/index.vue'
export { defaultCellContextMenuKeys } from './contextMenu/keys'
export {
  runContextMenuAction,
  resolveContextMenuKeys,
  processContextMenuKeys,
  contextMenuActions,
} from './contextMenu/registry'
export { buildContextMenuItems } from './contextMenu/buildItems'
export type { ProcessedContextMenuItem } from './contextMenu/buildItems'
export type { ContextMenuActionContext } from './contextMenu/registry'

export { default as SheetTabContextMenu } from './sheetTabMenu/index.vue'
export { defaultSheetTabMenuKeys } from './sheetTabMenu/keys'
export {
  sheetTabMenuActions,
  resolveSheetTabMenuKeys,
  processSheetTabMenuKeys,
  runSheetTabMenuAction,
} from './sheetTabMenu/registry'
export type { SheetTabMenuActionContext, SheetTabMenuItemConfig } from './sheetTabMenu/types'

import type { ContextMenuItemConfig } from '../../types'

/** 默认单元格右键菜单（可通过 cellContextMenu 覆盖） */
export const defaultCellContextMenuKeys: ContextMenuItemConfig[] = [
  'copy',
  'cut',
  'paste',
  '|',
  'insertRow',
  'deleteRow',
  'insertCol',
  '|',
  'clear',
]

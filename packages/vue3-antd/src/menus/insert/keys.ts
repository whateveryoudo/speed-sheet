import type { InsertMenuItemConfig } from './types'

/** 默认插入菜单（对齐语雀：不含图表；行列插入可通过 includeKeys 自行加入） */
export const defaultInsertMenuKeys: InsertMenuItemConfig[] = [
  'checkbox',
  'dropdown',
  '|',
  'image',
  'link',
  'attachment',
  'note',
  '|',
  'formula',
]

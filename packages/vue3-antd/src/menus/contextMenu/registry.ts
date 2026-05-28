import type { ContextMenuActionContext, ContextMenuItemConfig, SpeedSheetProps } from '../../types'
import { defaultCellContextMenuKeys } from './keys'
import { selectionColCount, selectionRowCount } from './format'

export type { ContextMenuActionContext }

export interface RunContextMenuOptions {
  count?: number
}

export function runContextMenuAction(
  key: string,
  _keys: ContextMenuItemConfig[],
  ctx: ContextMenuActionContext,
  options: RunContextMenuOptions = {},
): void {
  const sheet = ctx.sheet
  const sel = ctx.selection
  if (!sheet || !sel) return
  const count = Math.max(1, options.count ?? 1)
  const close = ctx.close

  switch (key) {
    case 'copy':
      sheet.chain().copy().run()
      close()
      break
    case 'cut':
      sheet.chain().cut().run()
      close()
      break
    case 'paste':
      sheet.chain().paste().run()
      close()
      break
    case 'insertRowAbove':
      sheet.chain().insertRows({ at: sel.row[0], count }).run()
      close()
      break
    case 'insertRowBelow':
      sheet.chain().insertRows({ at: sel.row[1] + 1, count }).run()
      close()
      break
    case 'insertColLeft':
      sheet.chain().insertCols({ at: sel.column[0], count }).run()
      close()
      break
    case 'insertColRight':
      sheet.chain().insertCols({ at: sel.column[1] + 1, count }).run()
      close()
      break
    case 'deleteRows':
      sheet.chain().deleteRows({ at: sel.row[0], count: selectionRowCount(sel) }).run()
      close()
      break
    case 'deleteCols':
      sheet.chain().deleteCols({ at: sel.column[0], count: selectionColCount(sel) }).run()
      close()
      break
    case 'mergeCells':
      sheet.chain().mergeCells({ row: sel.row, column: sel.column }).run()
      close()
      break
    case 'unmergeCells':
      sheet.chain().unmergeCells().run()
      close()
      break
    case 'clear':
      sheet.chain().clearSelection().run()
      close()
      break
    default:
      break
  }
}

/** @deprecated 场景菜单由 buildContextMenuItems 生成，保留兼容自定义 keys */
export function resolveContextMenuKeys(
  keys: ContextMenuItemConfig[] | undefined,
  excludeKeys?: string[],
): ContextMenuItemConfig[] {
  const base = keys ?? defaultCellContextMenuKeys
  if (!excludeKeys?.length) return base
  return base.filter((item) => {
    const key = typeof item === 'string' ? item : item.key
    return key === '|' || !excludeKeys.includes(key)
  })
}

/** @deprecated 请使用 buildContextMenuItems */
export function processContextMenuKeys(
  keys: ContextMenuItemConfig[],
  lang: NonNullable<SpeedSheetProps['lang']>,
  ctx: ContextMenuActionContext,
) {
  void keys
  void lang
  void ctx
  return []
}

/** @deprecated */
export const contextMenuActions = {}

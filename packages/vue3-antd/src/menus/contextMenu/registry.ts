import type { ContextMenuActionContext, ContextMenuItemConfig, SpeedSheetProps } from '../../types'
import { defaultCellContextMenuKeys } from './keys'

export type { ContextMenuActionContext }

export interface ContextMenuActionDef {
  title: Record<NonNullable<SpeedSheetProps['lang']>, string>
  disabled?: (ctx: ContextMenuActionContext) => boolean
  run: (ctx: ContextMenuActionContext) => void
}

export const contextMenuActions: Record<string, ContextMenuActionDef> = {
  copy: {
    title: { zh: '复制', en: 'Copy', zh_tw: '複製', es: 'Copiar' },
    run: ({ sheet, close }) => {
      sheet?.chain().copy().run()
      close()
    },
  },
  cut: {
    title: { zh: '剪切', en: 'Cut', zh_tw: '剪下', es: 'Cortar' },
    run: ({ sheet, close }) => {
      sheet?.chain().cut().run()
      close()
    },
  },
  paste: {
    title: { zh: '粘贴', en: 'Paste', zh_tw: '貼上', es: 'Pegar' },
    run: ({ sheet, close }) => {
      sheet?.chain().paste().run()
      close()
    },
  },
  insertRow: {
    title: { zh: '在上方插入行', en: 'Insert row above', zh_tw: '在上方插入列', es: 'Insertar fila arriba' },
    run: ({ sheet, r, close }) => {
      sheet?.chain().insertRows({ at: r, count: 1 }).run()
      close()
    },
  },
  deleteRow: {
    title: { zh: '删除行', en: 'Delete row', zh_tw: '刪除列', es: 'Eliminar fila' },
    run: ({ sheet, r, close }) => {
      sheet?.chain().deleteRows({ at: r, count: 1 }).run()
      close()
    },
  },
  insertCol: {
    title: { zh: '在左侧插入列', en: 'Insert column left', zh_tw: '在左側插入欄', es: 'Insertar columna izquierda' },
    run: ({ sheet, c, close }) => {
      sheet?.chain().insertCols({ at: c, count: 1 }).run()
      close()
    },
  },
  clear: {
    title: { zh: '清除内容', en: 'Clear contents', zh_tw: '清除內容', es: 'Borrar contenido' },
    run: ({ sheet, close }) => {
      sheet?.chain().clearSelection().run()
      close()
    },
  },
}

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

export type ProcessedContextMenuItem =
  | { type: 'divider' }
  | {
      type: 'item'
      key: string
      title: string
      disabled: boolean
    }

export function processContextMenuKeys(
  keys: ContextMenuItemConfig[],
  lang: NonNullable<SpeedSheetProps['lang']>,
  ctx: ContextMenuActionContext,
): ProcessedContextMenuItem[] {
  const result: ProcessedContextMenuItem[] = []

  for (const item of keys) {
    const key = typeof item === 'string' ? item : item.key
    if (key === '|') {
      if (result.length > 0 && result[result.length - 1]?.type !== 'divider') {
        result.push({ type: 'divider' })
      }
      continue
    }

    if (typeof item === 'object' && item.action) {
      const disabled =
        typeof item.disabled === 'function'
          ? item.disabled(ctx)
          : (item.disabled ?? false)
      result.push({
        type: 'item',
        key,
        title: item.title,
        disabled,
      })
      continue
    }

    const def = contextMenuActions[key]
    if (!def) continue

    const title =
      typeof item === 'object' && item.title ? item.title : def.title[lang] ?? def.title.en

    result.push({
      type: 'item',
      key,
      title,
      disabled: def.disabled?.(ctx) ?? false,
    })
  }

  while (result[0]?.type === 'divider') result.shift()
  while (result[result.length - 1]?.type === 'divider') result.pop()

  return result
}

export function runContextMenuAction(
  key: string,
  keys: ContextMenuItemConfig[],
  ctx: ContextMenuActionContext,
): void {
  for (const item of keys) {
    const itemKey = typeof item === 'string' ? item : item.key
    if (itemKey !== key) continue
    if (typeof item === 'object' && item.action) {
      item.action(ctx)
      return
    }
    contextMenuActions[key]?.run(ctx)
    return
  }
}

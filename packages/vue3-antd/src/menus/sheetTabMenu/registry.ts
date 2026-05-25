import type { SheetTabMenuActionContext, SheetTabMenuItemConfig, SheetTabMenuLang } from './types'
import { defaultSheetTabMenuKeys } from './keys'

export type { SheetTabMenuActionContext }

export interface SheetTabMenuActionDef {
  title: Record<SheetTabMenuLang, string>
  disabled?: (ctx: SheetTabMenuActionContext) => boolean
  run: (ctx: SheetTabMenuActionContext) => void
}

const TAB_COLORS = ['#1a73e8', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#00acc1']

export const sheetTabMenuActions: Record<string, SheetTabMenuActionDef> = {
  delete: {
    title: { zh: '删除', en: 'Delete', zh_tw: '刪除', es: 'Eliminar' },
    disabled: (ctx) => (ctx.sheet?.getSheetIds().length ?? 0) <= 1,
    run: ({ sheet, sheetId, close }) => {
      sheet?.deleteSheet(sheetId)
      close()
    },
  },
  rename: {
    title: { zh: '重命名', en: 'Rename', zh_tw: '重新命名', es: 'Renombrar' },
    run: ({ sheet, sheetId, close }) => {
      const cur = sheet?.getSheetName(sheetId) ?? ''
      const name = window.prompt('工作表名称', cur)
      if (name != null && name.trim()) sheet?.renameSheet(sheetId, name.trim())
      close()
    },
  },
  duplicate: {
    title: { zh: '创建副本', en: 'Duplicate', zh_tw: '建立副本', es: 'Duplicar' },
    run: ({ sheet, sheetId, close }) => {
      sheet?.duplicateSheet(sheetId)
      close()
    },
  },
  copyLink: {
    title: { zh: '复制工作表链接', en: 'Copy sheet link', zh_tw: '複製工作表連結', es: 'Copiar enlace' },
    run: ({ sheetId, close }) => {
      const url = `${location.href.split('#')[0]}#sheet=${sheetId}`
      void navigator.clipboard?.writeText(url)
      close()
    },
  },
  hide: {
    title: { zh: '隐藏工作表', en: 'Hide sheet', zh_tw: '隱藏工作表', es: 'Ocultar hoja' },
    disabled: (ctx) => (ctx.sheet?.getVisibleSheetIds().length ?? 0) <= 1,
    run: ({ sheet, sheetId, close }) => {
      sheet?.setSheetHidden(sheetId, true)
      close()
    },
  },
  tabColor: {
    title: { zh: '工作表标签颜色', en: 'Tab color', zh_tw: '工作表標籤顏色', es: 'Color de pestaña' },
    run: () => {},
  },
}

export function resolveSheetTabMenuKeys(
  keys: SheetTabMenuItemConfig[] | undefined,
  excludeKeys?: string[],
): SheetTabMenuItemConfig[] {
  const base = keys ?? defaultSheetTabMenuKeys
  if (!excludeKeys?.length) return base
  return base.filter((item) => {
    const key = typeof item === 'string' ? item : item.key
    return key === '|' || !excludeKeys.includes(key)
  })
}

export type ProcessedSheetTabMenuItem =
  | { type: 'divider' }
  | { type: 'item'; key: string; title: string; disabled: boolean }
  | { type: 'color-submenu'; key: string; title: string; colors: string[] }

export function processSheetTabMenuKeys(
  keys: SheetTabMenuItemConfig[],
  lang: SheetTabMenuLang,
  ctx: SheetTabMenuActionContext,
): ProcessedSheetTabMenuItem[] {
  const out: ProcessedSheetTabMenuItem[] = []
  for (const item of keys) {
    if (item === '|') {
      out.push({ type: 'divider' })
      continue
    }
    if (typeof item === 'object') {
      const disabled =
        typeof item.disabled === 'function' ? item.disabled(ctx) : !!item.disabled
      out.push({
        type: 'item',
        key: item.key,
        title: item.title,
        disabled,
      })
      continue
    }
    if (item === 'tabColor') {
      const def = sheetTabMenuActions.tabColor!
      out.push({
        type: 'color-submenu',
        key: 'tabColor',
        title: def.title[lang],
        colors: TAB_COLORS,
      })
      continue
    }
    const def = sheetTabMenuActions[item]
    if (!def) continue
    out.push({
      type: 'item',
      key: item,
      title: def.title[lang],
      disabled: def.disabled?.(ctx) ?? false,
    })
  }
  return out
}

sheetTabMenuActions.tabColor = {
  title: { zh: '工作表标签颜色', en: 'Tab color', zh_tw: '工作表標籤顏色', es: 'Color de pestaña' },
  run: () => {},
}

export function runSheetTabMenuAction(
  key: string,
  keys: SheetTabMenuItemConfig[],
  ctx: SheetTabMenuActionContext,
  color?: string,
): void {
  if (key === 'tabColor' && color) {
    ctx.sheet?.setSheetTabColor(ctx.sheetId, color)
    ctx.close()
    return
  }
  const custom = keys.find((k) => typeof k === 'object' && k.key === key) as
    | Extract<SheetTabMenuItemConfig, { key: string }>
    | undefined
  if (custom && typeof custom === 'object' && custom.action) {
    custom.action(ctx)
    return
  }
  sheetTabMenuActions[key]?.run(ctx)
}

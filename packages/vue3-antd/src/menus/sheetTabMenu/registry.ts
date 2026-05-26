import type { SheetT } from '../../i18n'
import { sheetI18n } from '../../i18n'
import type { SheetTabMenuActionContext, SheetTabMenuItemConfig } from './types'
import { defaultSheetTabMenuKeys } from './keys'

export type { SheetTabMenuActionContext }

export interface SheetTabMenuActionDef {
  titleKey: string
  disabled?: (ctx: SheetTabMenuActionContext) => boolean
  run: (ctx: SheetTabMenuActionContext) => void
}

export const sheetTabMenuActions: Record<string, SheetTabMenuActionDef> = {
  delete: {
    titleKey: 'sheetTabMenu.delete',
    disabled: (ctx) => (ctx.sheet?.getSheetIds().length ?? 0) <= 1,
    run: ({ sheet, sheetId, close }) => {
      sheet?.deleteSheet(sheetId)
      close()
    },
  },
  rename: {
    titleKey: 'sheetTabMenu.rename',
    run: ({ sheet, sheetId, close }) => {
      const cur = sheet?.getSheetName(sheetId) ?? ''
      const name = window.prompt(sheetI18n.global.t('sheetTabMenu.renamePrompt'), cur)
      if (name != null && name.trim()) sheet?.renameSheet(sheetId, name.trim())
      close()
    },
  },
  duplicate: {
    titleKey: 'sheetTabMenu.duplicate',
    run: ({ sheet, sheetId, close }) => {
      sheet?.duplicateSheet(sheetId)
      close()
    },
  },
  copyLink: {
    titleKey: 'sheetTabMenu.copyLink',
    run: ({ sheetId, close }) => {
      const url = `${location.href.split('#')[0]}#sheet=${sheetId}`
      void navigator.clipboard?.writeText(url)
      close()
    },
  },
  hide: {
    titleKey: 'sheetTabMenu.hide',
    disabled: (ctx) => (ctx.sheet?.getVisibleSheetIds().length ?? 0) <= 1,
    run: ({ sheet, sheetId, close }) => {
      sheet?.setSheetHidden(sheetId, true)
      close()
    },
  },
  tabColor: {
    titleKey: 'sheetTabMenu.tabColor',
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
  | { type: 'color-submenu'; key: string; title: string }

export function processSheetTabMenuKeys(
  keys: SheetTabMenuItemConfig[],
  t: SheetT,
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
        title: t(def.titleKey),
      })
      continue
    }
    const def = sheetTabMenuActions[item]
    if (!def) continue
    out.push({
      type: 'item',
      key: item,
      title: t(def.titleKey),
      disabled: def.disabled?.(ctx) ?? false,
    })
  }
  return out
}

export function runSheetTabMenuAction(
  key: string,
  keys: SheetTabMenuItemConfig[],
  ctx: SheetTabMenuActionContext,
  color?: string | null,
): void {
  if (key === 'tabColor' && color !== undefined) {
    ctx.sheet?.setSheetTabColor(ctx.sheetId, color)
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

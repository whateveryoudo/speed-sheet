import type { Sheet } from '@speed-sheet/core'

/** 页签菜单 slot / 事件 payload */
export interface SheetTabMenuState {
  sheetId: string
  clientX: number
  clientY: number
}

export interface SheetTabMenuActionContext {
  sheet: Sheet | null | undefined
  sheetId: string
  close: () => void
}

export type SheetTabMenuItemConfig =
  | string
  | {
      key: string
      title: string
      disabled?: boolean | ((ctx: SheetTabMenuActionContext) => boolean)
      action?: (ctx: SheetTabMenuActionContext) => void
    }

export type SheetTabMenuLang = import('../../i18n').SheetLocale

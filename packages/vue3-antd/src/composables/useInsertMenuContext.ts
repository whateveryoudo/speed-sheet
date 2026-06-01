import { inject, provide, type InjectionKey, type Ref } from 'vue'
import type { InsertMenuConfig, InsertMenuItemConfig } from '../menus/insert/types'

export interface InsertMenuContext {
  insertMenuKeys?: Ref<InsertMenuItemConfig[] | undefined>
  insertMenuConfig?: Ref<InsertMenuConfig | undefined>
}

const INSERT_MENU_KEY: InjectionKey<InsertMenuContext> = Symbol('speed-sheet-insert-menu')

export function provideInsertMenu(ctx: InsertMenuContext): void {
  provide(INSERT_MENU_KEY, ctx)
}

export function useInsertMenuContext(): InsertMenuContext {
  return inject(INSERT_MENU_KEY, {})
}

import type { InjectionKey, Ref } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'

export interface SheetToolbarContext {
  sheet: Ref<Sheet | null | undefined>
  /** 与 useSheet.revision 同步，驱动工具栏读取 sheet.state */
  revision: Ref<number>
  formatPainterActive: Ref<boolean>
  copiedStyle: Ref<Partial<CellAttributes> | null>
  findReplaceOpen: Ref<boolean>
}

export const SHEET_TOOLBAR_KEY: InjectionKey<SheetToolbarContext> =
  Symbol('sheetToolbar')

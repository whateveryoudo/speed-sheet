import type { InjectionKey, Ref } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'
import type { CellAttributes } from '@speed-sheet/shared'

export interface SheetToolbarContext {
  sheet: Ref<Sheet | null | undefined>
  selection: Ref<Selection | undefined>
  cells: Ref<Array<{ r: number; c: number; data: CellAttributes | null }>>
  formatPainterActive: Ref<boolean>
  copiedStyle: Ref<Partial<CellAttributes> | null>
  findReplaceOpen: Ref<boolean>
}

export const SHEET_TOOLBAR_KEY: InjectionKey<SheetToolbarContext> =
  Symbol('sheetToolbar')

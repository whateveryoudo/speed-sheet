import { inject, type InjectionKey } from 'vue'
import type { Ref } from 'vue'
import type { FormulaEditContext, SheetEditorContext } from '@speed-sheet/vue3'
import type { SheetPreviewImage } from '../helpers/sheetPreviewImage'

export interface SpeedSheetContext {
  formulaEdit: FormulaEditContext
  sheetEditor: SheetEditorContext
  previewInstance: Ref<SheetPreviewImage | null>
}

export const SPEED_SHEET_KEY: InjectionKey<SpeedSheetContext> = Symbol('speedSheet')

export function useSpeedSheet(): SpeedSheetContext {
  const ctx = inject(SPEED_SHEET_KEY)
  if (!ctx) {
    throw new Error('useSpeedSheet must be used within SpeedSheet')
  }
  return ctx
}

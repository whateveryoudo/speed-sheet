import { computed, provide, ref, unref, type ComputedRef, type MaybeRef, type Ref } from 'vue'
import {
  provideFormulaEdit,
  provideSheetEditor,
  provideSheetUpload,
  resolveSheetUploadConfig,
  type FormulaEditContext,
  type SheetEditorContext,
  type SheetUploadConfig,
} from '@speed-sheet/vue3'
import type { SheetPreviewImage } from '../helpers/sheetPreviewImage'
import { SPEED_SHEET_KEY, type SpeedSheetContext } from './useSpeedSheet'

export interface SpeedSheetProviderOptions {
  editable: Ref<boolean>
  /** 覆盖 App 级 upload；未传则仅用全局配置 */
  upload?: MaybeRef<SheetUploadConfig | undefined>
}

export type { SpeedSheetContext }

/**
 * 在 SpeedSheet 根组件调用一次（对标 useSpeedEditorProvider）。
 */
export function useSpeedSheetProvider(options: SpeedSheetProviderOptions): SpeedSheetContext {
  const formulaEdit = provideFormulaEdit()
  const sheetEditor = provideSheetEditor(options.editable)
  const previewInstance = ref<SheetPreviewImage | null>(null)
  const uploadSource = options.upload
  provideSheetUpload(
    computed(() => resolveSheetUploadConfig(uploadSource != null ? unref(uploadSource) : undefined)),
  )
  const ctx: SpeedSheetContext = {
    formulaEdit,
    sheetEditor,
    previewInstance: previewInstance as Ref<SheetPreviewImage | null>,
  }
  provide(SPEED_SHEET_KEY, ctx)
  return ctx
}

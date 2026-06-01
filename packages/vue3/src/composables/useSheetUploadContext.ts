import { computed, inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { resolveSheetUploadConfig } from './useSheetGlobalConfig'

export interface SheetUploadApis {
  fileUploadSingle?: (formData: FormData) => Promise<unknown>
  fileDownload?: (fileId: string) => Promise<unknown>
  getPreviewUrl?: (fileId: string) => string
}

export interface SheetUploadConfig {
  apis?: SheetUploadApis
  transformFileItem?: (item: unknown) => {
    id: string
    fileName: string
    fileType?: string
    fileSize?: string | number
    previewUrl?: string
  }
  imageAccept?: string
  fileAccept?: string
  maxSize?: number
}

export const SHEET_UPLOAD_KEY: InjectionKey<Ref<SheetUploadConfig>> = Symbol('sheetUpload')

export function provideSheetUpload(config: Ref<SheetUploadConfig> | ComputedRef<SheetUploadConfig>) {
  provide(SHEET_UPLOAD_KEY, config as Ref<SheetUploadConfig>)
}

export function useSheetUploadConfig() {
  const cfg = inject(SHEET_UPLOAD_KEY, null)
  if (cfg) {
    return computed(() => cfg.value ?? {})
  }
  return computed(() => resolveSheetUploadConfig())
}

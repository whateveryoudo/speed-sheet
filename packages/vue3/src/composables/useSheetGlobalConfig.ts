import { inject, ref, type InjectionKey, type Ref } from 'vue'
import type { SheetUploadApis, SheetUploadConfig } from './useSheetUploadContext'

/** App 级配置（对标 speed-tiptap-editor GlobalConfig + speedUseTiptapConfig） */
export interface SpeedSheetGlobalConfig {
  /** 顶层 API，与 upload.apis 合并（install 时与 tiptap 一致） */
  apis?: SheetUploadApis
  /** 通用上传配置（transform、accept 等） */
  upload?: SheetUploadConfig
}

export const SPEED_SHEET_GLOBAL_CONFIG_KEY: InjectionKey<Ref<SpeedSheetGlobalConfig>> = Symbol(
  'speedSheetGlobalConfig',
)

const globalConfigRef = ref<SpeedSheetGlobalConfig>({})

export function setSpeedSheetGlobalConfig(config: Partial<SpeedSheetGlobalConfig>): void {
  globalConfigRef.value = {
    ...globalConfigRef.value,
    ...config,
    apis: { ...globalConfigRef.value.apis, ...config.apis },
    upload: {
      ...globalConfigRef.value.upload,
      ...config.upload,
      apis: {
        ...globalConfigRef.value.apis,
        ...globalConfigRef.value.upload?.apis,
        ...config.apis,
        ...config.upload?.apis,
      },
    },
  }
}

export function provideSpeedSheetGlobalConfig(appProvide: (key: InjectionKey<Ref<SpeedSheetGlobalConfig>>, value: Ref<SpeedSheetGlobalConfig>) => void): void {
  appProvide(SPEED_SHEET_GLOBAL_CONFIG_KEY, globalConfigRef)
}

export function useSpeedSheetGlobalConfig(): Ref<SpeedSheetGlobalConfig> {
  return inject(SPEED_SHEET_GLOBAL_CONFIG_KEY, globalConfigRef)
}

/** 将 App 级配置与实例 props.upload 合并为最终上传配置 */
export function resolveSheetUploadConfig(
  instanceUpload?: SheetUploadConfig | null,
): SheetUploadConfig {
  const global = globalConfigRef.value
  const base: SheetUploadConfig = {
    ...global.upload,
    apis: {
      ...global.apis,
      ...global.upload?.apis,
    },
  }
  if (!instanceUpload) return base
  return {
    ...base,
    ...instanceUpload,
    apis: {
      ...base.apis,
      ...instanceUpload.apis,
    },
    transformFileItem: instanceUpload.transformFileItem ?? base.transformFileItem,
    imageAccept: instanceUpload.imageAccept ?? base.imageAccept,
    fileAccept: instanceUpload.fileAccept ?? base.fileAccept,
    maxSize: instanceUpload.maxSize ?? base.maxSize,
  }
}

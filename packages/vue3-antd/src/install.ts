import type { App } from 'vue'
import {
  ensureSpeedComponents,
  isSpeedComponentsInstalled,
} from 'speed-components-ui/components'
import 'speed-components-ui/dist/style.css'
import {
  provideSpeedSheetGlobalConfig,
  setSpeedSheetGlobalConfig,
  type SpeedSheetGlobalConfig,
} from '@speed-sheet/vue3'
import baseConfig from './config'
import { installSheetI18n, type SheetLocale } from './i18n'

export interface SpeedSheetUiInstallOptions extends SpeedSheetGlobalConfig {
  locale?: SheetLocale
  /** 仅宿主未 app.use(SpeedComponents) 时生效；已安装则不再合并 iconfont，避免重复 SVG */
  iconfontUrl?: string | string[]
}

export function installSpeedSheetUi(
  app: App,
  options?: SpeedSheetUiInstallOptions,
): void {
  if (options) {
    const { locale, ...global } = options
    setSpeedSheetGlobalConfig(global)
    installSheetI18n(app, locale)
  } else {
    installSheetI18n(app)
  }
  provideSpeedSheetGlobalConfig((key, value) => app.provide(key, value))

  if (isSpeedComponentsInstalled(app)) {
    ensureSpeedComponents(app)
    return
  }

  const fromHost = options?.iconfontUrl
  const urls = fromHost
    ? Array.isArray(fromHost)
      ? fromHost
      : [fromHost]
    : [baseConfig.iconfontUrl]
  ensureSpeedComponents(app, { iconfontUrl: urls })
}

export { setSpeedSheetGlobalConfig } from '@speed-sheet/vue3'
export type { SpeedSheetGlobalConfig } from '@speed-sheet/vue3'

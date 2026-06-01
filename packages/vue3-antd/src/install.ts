import type { App } from 'vue'
import { ensureSpeedComponents } from 'speed-components-ui/components'
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
  ensureSpeedComponents(app, {
    iconfontUrl: [baseConfig.iconfontUrl],
  })
}

export { setSpeedSheetGlobalConfig } from '@speed-sheet/vue3'
export type { SpeedSheetGlobalConfig } from '@speed-sheet/vue3'

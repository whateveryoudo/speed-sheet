import type { App } from 'vue'
import SpeedComponents from 'speed-components-ui/components'
import 'speed-components-ui/dist/style.css'
import baseConfig from './config'
import { installSheetI18n, type SheetLocale } from './i18n'

export interface SpeedSheetUiInstallOptions {
  locale?: SheetLocale
}

export function installSpeedSheetUi(
  app: App,
  options?: SpeedSheetUiInstallOptions,
): void {
  installSheetI18n(app, options?.locale)
  app.use(SpeedComponents, {
    iconfontUrl: [baseConfig.iconfontUrl],
  })
}

import type { App } from 'vue'
import SpeedComponents from 'speed-components-ui/components'
import 'speed-components-ui/dist/style.css'
import baseConfig from './config'
export interface SpeedSheetUiInstallOptions {
}

export function installSpeedSheetUi(
  app: App
): void {
  app.use(SpeedComponents, {
    iconfontUrl: [
      baseConfig.iconfontUrl
    ]
  })
}

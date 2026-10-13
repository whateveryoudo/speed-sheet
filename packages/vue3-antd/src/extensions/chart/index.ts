import { ChartExtension, CHART_EXTENSION_NAME } from '@speed-sheet/extension-chart'
import { VueSheetOverlayRenderer } from '@speed-sheet/vue3'
import ChartLayer from './Layer.vue'

export const SheetChart = ChartExtension.extend({
  name: CHART_EXTENSION_NAME,

  addNodeView() {
    return VueSheetOverlayRenderer(ChartLayer)
  },
})

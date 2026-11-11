import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

let registered = false

export function ensureEcharts(): typeof echarts {
  if (!registered) {
    echarts.use([
      CanvasRenderer,
      BarChart,
      LineChart,
      PieChart,
      TitleComponent,
      TooltipComponent,
      GridComponent,
      LegendComponent,
      DatasetComponent,
    ])
    registered = true
  }
  return echarts
}

// 模块初始化时执行一次
ensureEcharts()

export type ECharts = echarts.ECharts
export { echarts }

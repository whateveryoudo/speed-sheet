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

// 按需注册核心组件与当前支持的图表类型（柱状/条形图、折线/面积图、饼/环形图）
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

export type ECharts = echarts.ECharts
export { echarts }

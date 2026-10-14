import type { SheetChartConfig, SheetChartItem } from '@speed-sheet/shared'

export type SetterType =
  | 'input'
  | 'select'
  | 'number-range'
  | 'color-palette'
  | 'elements-grid'

export interface SchemaFieldItem {
  key: string
  label: string
  type: SetterType
  placeholder?: string
  options?: Array<{ label: string; value: any }>
  /** 双数值极值专用 */
  minKey?: keyof SheetChartConfig
  maxKey?: keyof SheetChartConfig
  minLabel?: string
  maxLabel?: string
  /** 动态隐藏条件 */
  hidden?: (chart: SheetChartItem) => boolean
}

export interface SchemaSection {
  key: string
  title: string
  /** 是否隐藏整个折叠卡片 */
  hidden?: (chart: SheetChartItem) => boolean
  items: SchemaFieldItem[]
}

export interface ColorPalettePreset {

  id: string
  name: string
  colors: string[]
}

export const COLOR_PALETTES: ColorPalettePreset[] = [
  {
    id: 'default',
    name: '经典多色',
    colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272'],
  },
  {
    id: 'business-blue',
    name: '商务深蓝',
    colors: ['#1677ff', '#fa8c16', '#8c8c8c', '#faad14', '#13c2c2', '#52c41a'],
  },
  {
    id: 'cool-tech',
    name: '科技青蓝',
    colors: ['#0079ff', '#00dfa2', '#f6fa70', '#ff0060', '#6527be', '#00b4d8'],
  },
  {
    id: 'warm-sunset',
    name: '暖色果香',
    colors: ['#ff7a45', '#ffc069', '#597ef7', '#36cfc9', '#9254de', '#ff4d4f'],
  },
  {
    id: 'nature-green',
    name: '自然青翠',
    colors: ['#52c41a', '#1890ff', '#faad14', '#2f54eb', '#13c2c2', '#a0d911'],
  },
  {
    id: 'gradient-blue',
    name: '深蓝渐变',
    colors: ['#1d39c4', '#2f54eb', '#597ef7', '#85a5ff', '#adc6ff', '#d6e4ff'],
  },
  {
    id: 'gradient-teal',
    name: '青绿渐变',
    colors: ['#006d75', '#08979c', '#13c2c2', '#36cfc9', '#5cdbd3', '#87e8de'],
  },
  {
    id: 'gradient-green',
    name: '苍翠渐变',
    colors: ['#135200', '#237804', '#389e0d', '#52c41a', '#73d13d', '#95de64'],
  },
  {
    id: 'gradient-amber',
    name: '琥珀渐变',
    colors: ['#873800', '#ad4e00', '#d46b08', '#fa8c16', '#ffa940', '#ffd591'],
  },
  {
    id: 'gradient-gray',
    name: '石板灰阶',
    colors: ['#262626', '#434343', '#595959', '#8c8c8c', '#bfbfbf', '#d9d9d9'],
  },
]

/** 元素样式折叠面板 Schema */
export const chartStyleSections: SchemaSection[] = [
  {
    key: 'title',
    title: '图表标题',
    items: [
      {
        key: 'title',
        label: '标题内容',
        type: 'input',
        placeholder: '请输入图表标题',
      },
    ],
  },
  {
    key: 'axis',
    title: '坐标轴与极值',
    hidden: (chart) => chart.config.chartType === 'pie' || chart.config.chartType === 'doughnut',
    items: [
      {
        key: 'xAxisTitle',
        label: '横轴标题（X 轴）',
        type: 'input',
        placeholder: '如：月份 / 部门',
      },
      {
        key: 'yAxisTitle',
        label: '纵轴标题（Y 轴）',
        type: 'input',
        placeholder: '如：金额（万元）/ 数量',
      },
      {
        key: 'yAxisRange',
        label: '纵轴极值范围',
        type: 'number-range',
        minKey: 'yAxisMin',
        maxKey: 'yAxisMax',
        minLabel: '最小值',
        maxLabel: '最大值',
      },
    ],
  },
  {
    key: 'legend',
    title: '图例位置',
    items: [
      {
        key: 'legendPosition',
        label: '位置方位',
        type: 'select',
        options: [
          { label: '上方', value: 'top' },
          { label: '下方', value: 'bottom' },
          { label: '左侧', value: 'left' },
          { label: '右侧', value: 'right' },
        ],
      },
    ],
  },
]

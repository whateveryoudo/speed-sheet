import { merge } from 'lodash-es'
import type { SheetChartConfig, SheetChartItem } from '@speed-sheet/shared'
import type { ExtractedChartDataset } from './dataset'

/** 默认优雅配色盘（对标语雀/飞书） */
export const DEFAULT_CHART_COLORS = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
]

/**
 * 核心转换器：将结构化数据集与通用配置组装为符合 ECharts 标准的 Option
 */
export function buildEChartsOption(
  dataset: ExtractedChartDataset,
  config: SheetChartConfig,
): Record<string, any> {
  const { chartType } = config
  const isPie = chartType === 'pie' || chartType === 'doughnut'
  const isHorizontalBar = chartType === 'bar-horizontal'

  // 1. 标题（固定靠左上角对齐，对标飞书/语雀，避免居中与图例重叠冲突）
  const title = config.showTitle && config.title ? {
    text: config.title,
    left: 12,
    top: 6,
    textStyle: {
      fontSize: 14,
      fontWeight: 'bold' as const,
      color: '#333333',
    },
  } : undefined

  // 2. 图例构建与自适应坐标（加入 type: scroll 支持项过多时翻页）
  const hasLegend = config.showLegend ?? true
  let legend: Record<string, any> | undefined = { show: false }
  const legendPos = hasLegend ? (config.legendPosition ?? 'bottom') : null

  if (hasLegend) {
    const posMap: Record<string, any> = {
      top: { top: 6, left: 'center', orient: 'horizontal' },
      bottom: { bottom: 4, left: 'center', orient: 'horizontal' },
      left: { left: 8, top: 'middle', orient: 'vertical' },
      right: { right: 8, top: 'middle', orient: 'vertical' },
    }
    legend = {
      show: true,
      type: 'scroll',
      ...(posMap[legendPos || 'bottom'] ?? posMap.bottom),
    }
  }

  // 3. 基础画布布局：自适应边距计算，防止图例与轴标题遮盖数据图形
  const hasTitle = Boolean(config.showTitle && config.title)
  const hasYTitle = Boolean(config.yAxisTitle)
  const hasXTitle = Boolean(config.xAxisTitle)

  let gridTop = 24
  let gridRight = 24
  let gridBottom = 20
  let gridLeft = 30

  if (hasTitle) gridTop = Math.max(gridTop, 36)
  if (hasYTitle) gridTop += 16

  if (legendPos === 'top') {
    // 标题在左上角，顶部图例居中排列，留出充足上边距
    gridTop = Math.max(gridTop, hasTitle ? 44 : 32)
  } else if (legendPos === 'bottom') {
    gridBottom += 28
  } else if (legendPos === 'right') {
    // 图例居右：留出 85px 避让宽度
    gridRight = 85
  } else if (legendPos === 'left') {
    // 图例居左：留出 75px 避让宽度，防止与 Y 轴刻度及标签打架
    gridLeft = 75
  }

  if (hasXTitle) gridBottom += 24

  const grid = {
    top: gridTop,
    right: gridRight,
    bottom: gridBottom,
    left: gridLeft,
    containLabel: true,
  }

  // 4. 系列与坐标轴构建
  let xAxis: Record<string, any> | undefined
  let yAxis: Record<string, any> | undefined
  let series: any[] = []

  if (isPie) {
    const pieData = dataset.categories.map((cat, i) => ({
      name: cat,
      value: dataset.seriesData[0]?.data[i] ?? 0,
    }))

    series = [
      {
        type: 'pie',
        radius: chartType === 'doughnut' ? ['45%', '70%'] : '65%',
        avoidLabelOverlap: true,
        label: {
          show: config.showDataLabels ?? true,
          position: chartType === 'doughnut' ? 'outside' : 'inside',
        },
        data: pieData,
      },
    ]
  } else if (isHorizontalBar) {
    const showAxis = config.showAxis ?? true
    const axisLine = { show: showAxis }
    const axisTick = { show: showAxis }
    const axisLabel = { show: showAxis }

    yAxis = {
      type: 'category',
      name: config.yAxisTitle || undefined,
      nameLocation: 'end',
      nameTextStyle: { fontSize: 12, color: '#666666' },
      axisLine,
      axisTick,
      axisLabel,
      data: dataset.categories,
      splitLine: { show: false },
    }
    xAxis = {
      type: 'value',
      name: config.xAxisTitle || undefined,
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { fontSize: 12, color: '#666666' },
      axisLine,
      axisTick,
      axisLabel,
      min: config.yAxisMin ?? undefined,
      max: config.yAxisMax ?? undefined,
      splitLine: { show: config.showGridLines ?? true },
    }
    series = dataset.seriesData.map((s) => ({
      name: s.name,
      type: 'bar',
      label: { show: config.showDataLabels ?? false, position: 'right' },
      data: s.data,
    }))
  } else {
    // 柱状图 / 折线图 / 堆叠 / 面积图
    const showAxis = config.showAxis ?? true
    const axisLine = { show: showAxis }
    const axisTick = { show: showAxis }
    const axisLabel = { show: showAxis }

    xAxis = {
      type: 'category',
      name: config.xAxisTitle || undefined,
      nameLocation: 'middle',
      nameGap: 24,
      nameTextStyle: { fontSize: 12, color: '#666666' },
      axisLine,
      axisTick,
      axisLabel,
      data: dataset.categories,
      splitLine: { show: false },
    }
    yAxis = {
      type: 'value',
      name: config.yAxisTitle || undefined,
      nameLocation: 'end',
      nameTextStyle: {
        fontSize: 12,
        color: '#666666',
        align: 'right',
        padding: [0, 6, 0, 0],
      },
      axisLine,
      axisTick,
      axisLabel,
      min: config.yAxisMin ?? undefined,
      max: config.yAxisMax ?? undefined,
      splitLine: { show: config.showGridLines ?? true },
    }


    const isStacked = chartType === 'bar-stacked' || chartType === 'area-stacked'
    const isLine = chartType === 'line' || chartType === 'line-smooth' || chartType === 'area-stacked'
    const isSmooth = chartType === 'line-smooth'

    series = dataset.seriesData.map((s) => ({
      name: s.name,
      type: isLine ? 'line' : 'bar',
      stack: isStacked ? 'total' : undefined,
      smooth: isSmooth,
      areaStyle: chartType === 'area-stacked' ? {} : undefined,
      label: { show: config.showDataLabels ?? false, position: isLine ? 'top' : 'top' },
      data: s.data,
    }))
  }

  const baseOption: Record<string, any> = {
    color: config.colorPalette ?? DEFAULT_CHART_COLORS,
    title,
    tooltip: {
      trigger: isPie ? 'item' : 'axis',
    },
    legend,
    ...(!isPie ? { grid, xAxis, yAxis } : {}),
    series,
  }

  // 5. 逃生通道：如果存在 customOption，直接 deepMerge 覆盖
  if (config.customOption && typeof config.customOption === 'object') {
    return merge({}, baseOption, config.customOption)
  }

  return baseOption
}

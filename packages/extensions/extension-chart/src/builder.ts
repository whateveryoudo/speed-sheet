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

  // 1. 标题
  const title = config.showTitle && config.title ? { text: config.title, left: 'center' } : undefined

  // 2. 图例
  let legend: Record<string, any> | undefined = { show: false }
  if (config.showLegend ?? true) {
    const pos = config.legendPosition ?? 'bottom'
    const posMap: Record<string, any> = {
      top: { top: 0, left: 'center', orient: 'horizontal' },
      bottom: { bottom: 0, left: 'center', orient: 'horizontal' },
      left: { left: 0, top: 'middle', orient: 'vertical' },
      right: { right: 0, top: 'middle', orient: 'vertical' },
    }
    legend = { show: true, ...(posMap[pos] ?? posMap.bottom) }
  }

  // 3. 基础画布布局
  const grid = {
    top: title ? 40 : 25,
    right: 20,
    bottom: legend?.show ? 35 : 20,
    left: 40,
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
    // 水平条形图
    yAxis = {
      type: 'category',
      data: dataset.categories,
      splitLine: { show: false },
    }
    xAxis = {
      type: 'value',
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
    xAxis = {
      type: 'category',
      data: dataset.categories,
      splitLine: { show: false },
    }
    yAxis = {
      type: 'value',
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

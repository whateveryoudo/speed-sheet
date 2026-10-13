import { Extension, type CommandContext } from '@speed-sheet/core'
import type { SheetChartItem, SheetChartConfig, SheetChartType } from '@speed-sheet/shared'

export const CHART_EXTENSION_NAME = 'sheetChart'

export interface SheetChartExtensionStorage {
  /** 存储或图表事件监听容器 */
  activeChartId?: string | null
}

function newChartId(): string {
  return `chart_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const ChartExtension = Extension.create<SheetChartExtensionStorage>({
  name: CHART_EXTENSION_NAME,
  priority: -40,

  addStorage() {
    return {
      activeChartId: null,
    }
  },

  addCommands() {
    return {
      insertSheetChart: (props: {
        r: number
        c: number
        range: SheetChartItem['range']
        type?: SheetChartType
        width?: number
        height?: number
        config?: Partial<SheetChartConfig>
        id?: string
      }) => {
        return ({ state }: CommandContext) => {
          const id = props.id ?? newChartId()
          const config: SheetChartConfig = {
            chartType: props.type ?? 'bar',
            showTitle: false,
            showLegend: true,
            legendPosition: 'bottom',
            showDataLabels: false,
            showGridLines: true,
            ...props.config,
          }

          const item: SheetChartItem = {
            id,
            row: props.r,
            col: props.c,
            width: props.width ?? 480,
            height: props.height ?? 300,
            offsetLeft: 10,
            offsetTop: 10,
            range: props.range,
            config,
          }

          state.setChart(item)
          return true
        }
      },

      updateSheetChartConfig: (props: {
        id: string
        config: Partial<SheetChartConfig>
      }) => {
        return ({ state }: CommandContext) => {
          const chart = state.getChart(props.id)
          if (!chart) return false
          state.setChart({
            ...chart,
            config: {
              ...chart.config,
              ...props.config,
            },
          })
          return true
        }
      },

      updateSheetChartRange: (props: {
        id: string
        range: SheetChartItem['range']
      }) => {
        return ({ state }: CommandContext) => {
          const chart = state.getChart(props.id)
          if (!chart) return false
          state.setChart({
            ...chart,
            range: {
              ...chart.range,
              ...props.range,
            },
          })
          return true
        }
      },

      updateSheetChartRect: (props: {
        id: string
        row?: number
        col?: number
        width?: number
        height?: number
        offsetLeft?: number
        offsetTop?: number
      }) => {
        return ({ state }: CommandContext) => {
          const chart = state.getChart(props.id)
          if (!chart) return false
          state.setChart({
            ...chart,
            row: props.row ?? chart.row,
            col: props.col ?? chart.col,
            width: props.width ?? chart.width,
            height: props.height ?? chart.height,
            offsetLeft: props.offsetLeft ?? chart.offsetLeft,
            offsetTop: props.offsetTop ?? chart.offsetTop,
          })
          return true
        }
      },

      removeSheetChart: (props: { id: string }) => {
        return ({ state }: CommandContext) => {
          state.deleteChart(props.id)
          return true
        }
      },
    }
  },
})

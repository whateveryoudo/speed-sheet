import { inject, provide, ref, type Ref } from 'vue'

export interface ChartConfigDrawerContext {
  visible: Ref<boolean>
  chartId: Ref<string | null>
  openDrawer: (id: string) => void
  closeDrawer: () => void
}

const ChartConfigDrawerKey = Symbol('ChartConfigDrawerKey')

export function provideChartConfigDrawer(): ChartConfigDrawerContext {
  const visible = ref(false)
  const chartId = ref<string | null>(null)

  function openDrawer(id: string) {
    chartId.value = id
    visible.value = true
  }

  function closeDrawer() {
    visible.value = false
    chartId.value = null
  }

  const ctx: ChartConfigDrawerContext = {
    visible,
    chartId,
    openDrawer,
    closeDrawer,
  }

  provide(ChartConfigDrawerKey, ctx)
  return ctx
}

export function useChartConfigDrawer(): ChartConfigDrawerContext {
  const ctx = inject<ChartConfigDrawerContext>(ChartConfigDrawerKey)
  if (!ctx) {
    throw new Error('useChartConfigDrawer must be used under SpeedSheet')
  }
  return ctx
}

export function useChartConfigDrawerOptional(): ChartConfigDrawerContext | null {
  return inject<ChartConfigDrawerContext | null>(ChartConfigDrawerKey, null)
}

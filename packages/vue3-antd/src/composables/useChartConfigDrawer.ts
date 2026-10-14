import { inject, provide, ref, type Ref } from 'vue'

export interface ChartRange {
  row: [number, number]
  column: [number, number]
}

export interface ChartConfigDrawerContext {
  visible: Ref<boolean>
  chartId: Ref<string | null>
  activeChartId: Ref<string | null>
  openDrawer: (id: string) => void
  closeDrawer: () => void
  /** 是否处于选区拾取模式 */
  isPickingRange: Ref<boolean>
  /** 拾取中的临时范围 */
  pickingRange: Ref<ChartRange | null>
  startPickingRange: (initial?: ChartRange, confirmCb?: (range: ChartRange) => void) => void
  updatePickingRange: (range: ChartRange) => void
  confirmPickingRange: () => void
  cancelPickingRange: () => void
}

const ChartConfigDrawerKey = Symbol('ChartConfigDrawerKey')

export function provideChartConfigDrawer(): ChartConfigDrawerContext {
  const visible = ref(false)
  const chartId = ref<string | null>(null)
  const activeChartId = ref<string | null>(null)
  const isPickingRange = ref(false)
  const pickingRange = ref<ChartRange | null>(null)
  let onConfirmCb: ((range: ChartRange) => void) | null = null

  function openDrawer(id: string) {
    chartId.value = id
    activeChartId.value = id
    visible.value = true
  }

  function closeDrawer() {
    cancelPickingRange()
    visible.value = false
    chartId.value = null
  }

  function startPickingRange(initial?: ChartRange, confirmCb?: (range: ChartRange) => void) {
    isPickingRange.value = true
    pickingRange.value = initial ? { row: [...initial.row], column: [...initial.column] } : null
    onConfirmCb = confirmCb ?? null
  }

  function updatePickingRange(range: ChartRange) {
    if (!isPickingRange.value) return
    pickingRange.value = {
      row: [Math.min(range.row[0], range.row[1]), Math.max(range.row[0], range.row[1])],
      column: [Math.min(range.column[0], range.column[1]), Math.max(range.column[0], range.column[1])],
    }
  }

  function confirmPickingRange() {
    if (!isPickingRange.value) return
    if (pickingRange.value && onConfirmCb) {
      onConfirmCb(pickingRange.value)
    }
    cancelPickingRange()
  }

  function cancelPickingRange() {
    isPickingRange.value = false
    pickingRange.value = null
    onConfirmCb = null
  }

  const ctx: ChartConfigDrawerContext = {
    visible,
    chartId,
    activeChartId,
    openDrawer,
    closeDrawer,
    isPickingRange,
    pickingRange,
    startPickingRange,
    updatePickingRange,
    confirmPickingRange,
    cancelPickingRange,
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

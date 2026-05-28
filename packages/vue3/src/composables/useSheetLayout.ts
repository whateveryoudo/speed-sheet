import { ref, computed, type Ref, type ComputedRef } from 'vue'
import {
  defaultLayout,
  buildGridMetrics,
  buildSheetGridMetrics,
  type GridLayout,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'

export function useSheetLayout(options: {
  sheet: Ref<Sheet | null>
  revision: Ref<number>
  rowHeaderWidth?: Ref<number | undefined>
  columnHeaderHeight?: Ref<number | undefined>
}) {
  const scrollX = ref(0)
  const scrollY = ref(0)
  const layout = ref<GridLayout>(
    defaultLayout({
      ...(options.rowHeaderWidth?.value != null
        ? { rowHeaderWidth: options.rowHeaderWidth.value }
        : {}),
      ...(options.columnHeaderHeight?.value != null
        ? { columnHeaderHeight: options.columnHeaderHeight.value }
        : {}),
    }),
  )

  const gridMetrics = computed((): GridMetrics => {
    void options.revision.value
    const s = options.sheet.value
    if (!s) {
      return buildGridMetrics({
        totalRows: layout.value.totalRows,
        totalCols: layout.value.totalCols,
        defaultRowHeight: layout.value.defaultRowHeight,
        defaultColWidth: layout.value.defaultColWidth,
      })
    }
    return buildSheetGridMetrics(s, layout.value)
  })

  const totalRows = computed(() => gridMetrics.value.totalRows)
  const totalCols = computed(() => gridMetrics.value.totalCols)
  const totalW = computed(() => layout.value.rowHeaderWidth + gridMetrics.value.totalWidth)
  const totalH = computed(() => layout.value.columnHeaderHeight + gridMetrics.value.totalHeight)

  function layoutForHit(): GridLayout {
    return {
      ...layout.value,
      scrollX: scrollX.value,
      scrollY: scrollY.value,
      metrics: gridMetrics.value,
      totalRows: totalRows.value,
      totalCols: totalCols.value,
    }
  }

  return {
    scrollX,
    scrollY,
    layout,
    gridMetrics,
    totalRows,
    totalCols,
    totalW,
    totalH,
    layoutForHit,
  }
}

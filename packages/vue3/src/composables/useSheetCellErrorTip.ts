import { ref, type Ref, type ComputedRef } from 'vue'
import type { CellAttributes } from '@speed-sheet/shared'

export function useSheetCellErrorTip(options: {
  viewportEl: Ref<HTMLElement | undefined>
  cells: Ref<Array<{ r: number; c: number; data: CellAttributes }>> | ComputedRef<Array<{ r: number; c: number; data: CellAttributes }>>
  cellPointFromEvent: (e: MouseEvent) => { r: number; c: number } | null
}) {
  const errorTip = ref({ show: false, x: 0, y: 0, message: '' })

  function hideErrorTip(): void {
    errorTip.value.show = false
  }

  function updateFromMouseEvent(e: MouseEvent): void {
    const pt = options.cellPointFromEvent(e)
    if (!pt) {
      hideErrorTip()
      return
    }
    const cell = options.cells.value.find((x) => x.r === pt.r && x.c === pt.c)
    const msg = cell?.data?.em
    if (!cell?.data?.ef || !msg) {
      hideErrorTip()
      return
    }
    const viewport = options.viewportEl.value
    if (!viewport) return
    const vpRect = viewport.getBoundingClientRect()
    errorTip.value = {
      show: true,
      x: e.clientX - vpRect.left + 8,
      y: e.clientY - vpRect.top - 36,
      message: msg,
    }
  }

  return { errorTip, hideErrorTip, updateFromMouseEvent }
}

import { computed, type Ref, type ComputedRef } from 'vue'
import type { Selection } from '@speed-sheet/shared'
import type { Sheet, CellEntry } from '@speed-sheet/core'

const EMPTY_SEL: Selection = { row: [0, 0], column: [0, 0] }

export function useSheetCanvasData(options: {
  sheet: Ref<Sheet | null>
  revision: Ref<number>
  onSelectRange: (
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    anchorR: number,
    anchorC: number,
  ) => void
}) {
  const sel = computed(() => {
    void options.revision.value
    return options.sheet.value?.state.getSelection() ?? EMPTY_SEL
  })

  const cells = computed(() => {
    void options.revision.value
    return options.sheet.value?.state.getAllCells() ?? []
  })

  const activeCell = computed(() => ({
    r: sel.value.anchor?.r ?? sel.value.row[0],
    c: sel.value.anchor?.c ?? sel.value.column[0],
  }))

  const cellEntries = computed<CellEntry[]>(() =>
    cells.value.map((c) => ({ r: c.r, c: c.c, data: c.data } as CellEntry)),
  )

  function applySelectRange(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    anchorR?: number,
    anchorC?: number,
  ): void {
    const ar = anchorR ?? r0
    const ac = anchorC ?? c0
    options.sheet.value
      ?.chain()
      .selectRange({ row: [r0, r1], column: [c0, c1], anchor: { r: ar, c: ac } })
      .run()
    options.onSelectRange(r0, c0, r1, c1, ar, ac)
  }

  return {
    sel,
    cells,
    activeCell,
    cellEntries,
    applySelectRange,
  }
}

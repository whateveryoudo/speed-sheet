import { computed, type Ref } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'

const EMPTY_SEL: Selection = { row: [0, 0], column: [0, 0] }

/** 从 sheet + revision 派生选区（供外壳组件如公式栏使用） */
export function useSheetSelection(
  sheet: Ref<Sheet | null>,
  revision: Ref<number>,
) {
  const selection = computed(() => {
    void revision.value
    return sheet.value?.state.getSelection() ?? EMPTY_SEL
  })

  const activeCell = computed(() => ({
    r: selection.value.anchor?.r ?? selection.value.row[0],
    c: selection.value.anchor?.c ?? selection.value.column[0],
  }))

  return { selection, activeCell }
}

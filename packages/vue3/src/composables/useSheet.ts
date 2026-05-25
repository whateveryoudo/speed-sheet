import { ref, shallowRef, computed, onMounted, onUnmounted, toValue, type Ref, type MaybeRefOrGetter, type ComputedRef } from 'vue'
import { Sheet, type SheetOptions, type LuckysheetFile, type WorkbookSnapshot, type Selection } from '@speed-sheet/core'
import type { SheetViewState } from '../types/sheet-view'

export interface UseSheetReturn {
  /** canvas 渲染用视图状态（单一数据源） */
  sheetView: Ref<SheetViewState>
  sheet: ComputedRef<Sheet | null>
  isReady: Ref<boolean>
  selection: ComputedRef<Selection>
  activeSheetId: Ref<string>
  sheetNames: Ref<string[]>
  /** @deprecated 请用 sheetView.value.cells */
  allCells: ComputedRef<SheetViewState['cells']>

  switchSheet: (id: string) => void
  toSnapshot: () => WorkbookSnapshot | null
  toLuckysheetFile: () => LuckysheetFile | null
}

export function useSheet(options: MaybeRefOrGetter<SheetOptions> = {}): UseSheetReturn {
  const sheet = shallowRef<Sheet | null>(null)
  const isReady = ref(false)
  const activeSheetId = ref('0')
  const sheetNames = ref<string[]>([])

  const sheetView = shallowRef<SheetViewState>({
    sheet: null,
    selection: { row: [0, 0], column: [0, 0] },
    cells: [],
    revision: 0,
  })

  const selection = computed(() => sheetView.value.selection)
  const allCells = computed(() => sheetView.value.cells)

  function refreshState(s: Sheet): void {
    const ids = Array.from(s.getYDoc().getMap('sheets').keys())
    sheetNames.value = ids
    if (ids.length && !ids.includes(activeSheetId.value)) {
      activeSheetId.value = ids[0]
    }
    sheetView.value = {
      ...sheetView.value,
      sheet: s,
      selection: s.state.getSelection(),
      cells: s.state.getAllCells(),
      revision: sheetView.value.revision + 1,
    }
  }

  onMounted(() => {
    const opts = toValue(options)
    const userOnUpdate = opts.onUpdate

    const instance = new Sheet({
      ...opts,
      onUpdate: (s) => {
        refreshState(s)
        userOnUpdate?.(s)
      },
    })

    const ids = Array.from(instance.getYDoc().getMap('sheets').keys())
    if (ids.length) activeSheetId.value = ids[0]

    sheet.value = instance
    isReady.value = true
    refreshState(instance)
  })

  onUnmounted(() => {
    sheet.value?.destroy()
    sheet.value = null
  })

  function switchSheet(id: string): void {
    sheet.value?.switchSheet(id)
    activeSheetId.value = id
    if (sheet.value) refreshState(sheet.value)
  }

  function toSnapshot(): WorkbookSnapshot | null {
    return sheet.value?.toSnapshot() ?? null
  }

  function toLuckysheetFile(): LuckysheetFile | null {
    return sheet.value?.toLuckysheetFile() ?? null
  }

  return {
    sheetView,
    sheet: computed(() => sheetView.value.sheet),
    isReady,
    selection,
    activeSheetId,
    sheetNames,
    allCells,
    switchSheet,
    toSnapshot,
    toLuckysheetFile,
  }
}

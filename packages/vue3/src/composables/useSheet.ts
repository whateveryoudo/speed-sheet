import { ref, shallowRef, onMounted, onUnmounted, toValue, type Ref, type MaybeRefOrGetter } from 'vue'
import { Sheet, type SheetOptions, type LuckysheetFile, type WorkbookSnapshot, type Selection } from '@speed-sheet/core'

export interface UseSheetReturn {
  sheet: Ref<Sheet | null>
  isReady: Ref<boolean>
  selection: Ref<Selection>
  activeSheetId: Ref<string>
  sheetNames: Ref<string[]>
  allCells: Ref<Array<{ r: number; c: number; data: any }>>

  switchSheet: (id: string) => void
  toSnapshot: () => WorkbookSnapshot | null
  toLuckysheetFile: () => LuckysheetFile | null
}

export function useSheet(options: MaybeRefOrGetter<SheetOptions> = {}): UseSheetReturn {
  const sheet = shallowRef<Sheet | null>(null)
  const isReady = ref(false)
  const selection = ref<Selection>({ row: [0, 0], column: [0, 0] })
  const activeSheetId = ref('0')
  const sheetNames = ref<string[]>([])
  const allCells = ref<Array<{ r: number; c: number; data: any }>>([])

  function refreshState(s: Sheet): void {
    selection.value = s.state.getSelection()
    const ids = Array.from(s.getYDoc().getMap('sheets').keys())
    sheetNames.value = ids
    if (ids.length && !ids.includes(activeSheetId.value)) {
      activeSheetId.value = ids[0]
    }
    allCells.value = s.state.getAllCells()
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
    sheet: sheet as Ref<Sheet | null>,
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

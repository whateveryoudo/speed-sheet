import { ref, shallowRef, onMounted, onUnmounted, toValue, type Ref, type MaybeRefOrGetter } from 'vue'
import { Sheet, type LuckysheetFile, type WorkbookSnapshot } from '@speed-sheet/core'
import { resolveSheetOptions, type UseSheetOptions } from './sheetBuiltin'

export type { UseSheetOptions }

export interface UseSheetReturn {
  /** 表格实例（对齐 Tiptap editor，选区/单元格请用 sheet.state 或 ref 暴露的方法） */
  sheet: Ref<Sheet | null>
  /** 每次 sheet 变更 +1，传给 SheetRenderer 触发重绘 */
  revision: Ref<number>
  isReady: Ref<boolean>
  activeSheetId: Ref<string>
  sheetNames: Ref<string[]>

  switchSheet: (id: string) => void
  addSheet: (name?: string) => string | null
  toSnapshot: () => WorkbookSnapshot | null
  toLuckysheetFile: () => LuckysheetFile | null
}

export function useSheet(options: MaybeRefOrGetter<UseSheetOptions> = {}): UseSheetReturn {
  const sheet = shallowRef<Sheet | null>(null)
  const revision = ref(0)
  const isReady = ref(false)
  const activeSheetId = ref('0')
  const sheetNames = ref<string[]>([])

  function refreshMeta(s: Sheet): void {
    sheetNames.value = s.getSheetIds()
    activeSheetId.value = s.getActiveSheetId()
    revision.value++
  }

  onMounted(() => {
    const opts = resolveSheetOptions(toValue(options))
    const userOnUpdate = opts.onUpdate

    const instance = new Sheet({
      ...opts,
      onUpdate: (s) => {
        refreshMeta(s)
        userOnUpdate?.(s)
      },
    })

    const ids = instance.getSheetIds()
    if (ids.length) activeSheetId.value = ids[0]

    sheet.value = instance
    isReady.value = true
    refreshMeta(instance)
  })

  onUnmounted(() => {
    sheet.value?.destroy()
    sheet.value = null
    isReady.value = false
  })

  function switchSheet(id: string): void {
    sheet.value?.switchSheet(id)
    if (sheet.value) refreshMeta(sheet.value)
  }

  function addSheet(name?: string): string | null {
    if (!sheet.value) return null
    const id = sheet.value.addSheet(name)
    refreshMeta(sheet.value)
    return id
  }

  function toSnapshot(): WorkbookSnapshot | null {
    return sheet.value?.toSnapshot() ?? null
  }

  function toLuckysheetFile(): LuckysheetFile | null {
    return sheet.value?.toLuckysheetFile() ?? null
  }

  return {
    sheet,
    revision,
    isReady,
    activeSheetId,
    sheetNames,
    switchSheet,
    addSheet,
    toSnapshot,
    toLuckysheetFile,
  }
}

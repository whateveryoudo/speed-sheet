import {
  onScopeDispose,
  ref,
  watch,
  type MaybeRefOrGetter,
  type Ref,
  toValue,
} from 'vue'
import type { Sheet } from '@speed-sheet/core'
import { attachYMapObserver, resolveYMapEntry } from './useYMapObserver'

export interface UseYMapKeyOptions<T> {
  /** ydoc 顶层 map，如 `sheets` */
  mapName: string
  /** map 内 entry id，如 sheetId */
  entryId: MaybeRefOrGetter<string>
  /** entry 上 Y.Map 的字段名 */
  key: string
  defaultValue?: T
}

/**
 * 订阅 ydoc → mapName → entryId 对应 Y.Map 的单个 key。
 * 通用 primitive；页签元数据请用 useSheetYMap。
 */
export function useYMapKey<T = string>(
  sheet: MaybeRefOrGetter<Sheet | null>,
  options: UseYMapKeyOptions<T>,
): Ref<T> {
  const { mapName, key, defaultValue } = options
  const value = ref(defaultValue as T) as Ref<T>
  let handle: ReturnType<typeof attachYMapObserver> | null = null

  function read(): T {
    const s = toValue(sheet)
    const id = toValue(options.entryId)
    const yMap = resolveYMapEntry(s, mapName, id)
    const raw = yMap?.get(key)
    return (raw ?? defaultValue) as T
  }

  function bind(): void {
    handle?.teardown()
    const s = toValue(sheet)
    const id = toValue(options.entryId)
    const yMap = resolveYMapEntry(s, mapName, id)
    handle = attachYMapObserver(yMap, () => {
      value.value = read()
    }, [key])
  }

  watch(
    () => [toValue(sheet), toValue(options.entryId)] as const,
    bind,
    { immediate: true },
  )
  onScopeDispose(() => handle?.teardown())

  return value
}

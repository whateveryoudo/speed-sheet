import {
  onScopeDispose,
  ref,
  watch,
  type MaybeRefOrGetter,
  type Ref,
  toValue,
} from 'vue'
import type { YMapEvent } from 'yjs'
import type { Sheet } from '@speed-sheet/core'

/**
 * 订阅 ydoc 顶层 Y.Map（如 `sheets`）结构变化：增删 entry、重排等。
 * 适合页签列表；单元格内容在 entry 内部的嵌套 map，不会触发此 hook。
 */
export function useYDocMap(
  sheet: MaybeRefOrGetter<Sheet | null>,
  mapName: string,
): Ref<string[]> {
  const keys = ref<string[]>([])
  let yMap: {
    keys: () => IterableIterator<string>
    observe: (fn: (e: YMapEvent<unknown>) => void) => void
    unobserve: (fn: (e: YMapEvent<unknown>) => void) => void
  } | null = null
  let observer: ((e: YMapEvent<unknown>) => void) | null = null

  function sync(): void {
    const s = toValue(sheet)
    keys.value = s ? Array.from(s.ydoc.getMap(mapName).keys()) : []
  }

  function teardown(): void {
    if (yMap && observer) yMap.unobserve(observer)
    yMap = null
    observer = null
  }

  function bind(): void {
    teardown()
    const s = toValue(sheet)
    if (!s) {
      sync()
      return
    }
    const map = s.ydoc.getMap(mapName)
    yMap = map as NonNullable<typeof yMap>
    observer = () => sync()
    yMap.observe(observer)
    sync()
  }

  watch(() => toValue(sheet), bind, { immediate: true })
  onScopeDispose(teardown)

  return keys
}

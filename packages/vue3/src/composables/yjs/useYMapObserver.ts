import type { YMapEvent } from 'yjs'
import type { Sheet } from '@speed-sheet/core'

export type YMapLike = {
  get: (key: string) => unknown
  observe: (fn: (e: YMapEvent<unknown>) => void) => void
  unobserve: (fn: (e: YMapEvent<unknown>) => void) => void
}

/** 解析 ydoc.getMap(mapName).get(entryId) */
export function resolveYMapEntry(
  sheet: Sheet | null | undefined,
  mapName: string,
  entryId: string,
): YMapLike | null {
  if (!sheet || !entryId) return null
  const entry = sheet.ydoc.getMap(mapName).get(entryId)
  return (entry as YMapLike | undefined) ?? null
}

export interface YMapObserverHandle {
  sync: () => void
  teardown: () => void
}

/**
 * 订阅某个 Y.Map 实例；keys 为空表示任意 key 变更都回调。
 */
export function attachYMapObserver(
  yMap: YMapLike | null,
  onChange: () => void,
  keys?: readonly string[],
): YMapObserverHandle {
  let observer: ((e: YMapEvent<unknown>) => void) | null = null

  const sync = () => onChange()

  const teardown = () => {
    if (yMap && observer) yMap.unobserve(observer)
    observer = null
  }

  if (!yMap) {
    onChange()
    return { sync, teardown }
  }

  observer = (event) => {
    if (!keys?.length) {
      onChange()
      return
    }
    for (const k of keys) {
      if (event.keysChanged.has(k)) {
        onChange()
        return
      }
    }
  }
  yMap.observe(observer)
  onChange()

  return { sync, teardown }
}

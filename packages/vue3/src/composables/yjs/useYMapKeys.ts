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

export interface UseYMapKeysOptions {
  mapName: string
  entryId: MaybeRefOrGetter<string>
}

type KeySpec<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] | { defaultValue: T[K] }
}

function resolveDefault<T extends Record<string, unknown>>(spec: KeySpec<T>): T {
  const out = {} as T
  for (const k of Object.keys(spec) as (keyof T)[]) {
    const v = spec[k]
    out[k] = (typeof v === 'object' && v !== null && 'defaultValue' in v
      ? (v as { defaultValue: T[keyof T] }).defaultValue
      : v) as T[keyof T]
  }
  return out
}

function readKeys<T extends Record<string, unknown>>(
  sheet: Sheet | null | undefined,
  mapName: string,
  entryId: string,
  spec: KeySpec<T>,
): T {
  const defaults = resolveDefault(spec)
  const yMap = resolveYMapEntry(sheet, mapName, entryId)
  if (!yMap) return { ...defaults }
  const out = { ...defaults }
  for (const k of Object.keys(spec) as (keyof T)[]) {
    const raw = yMap.get(k as string)
    if (raw !== undefined && raw !== null) {
      out[k] = raw as T[keyof T]
    }
  }
  return out
}

/**
 * 同一 Y.Map entry 上订阅多个 key，共用一个 observe。
 *
 * @example
 * const meta = useYMapKeys(sheet, {
 *   mapName: 'sheets',
 *   entryId: sheetId,
 * }, { color: '', name: '', hidden: undefined as number | undefined })
 */
export function useYMapKeys<T extends Record<string, unknown>>(
  sheet: MaybeRefOrGetter<Sheet | null>,
  options: UseYMapKeysOptions,
  spec: KeySpec<T>,
): Ref<T> {
  const watchedKeys = Object.keys(spec) as string[]
  const value = ref(readKeys(toValue(sheet), options.mapName, toValue(options.entryId), spec)) as Ref<T>
  let handle: ReturnType<typeof attachYMapObserver> | null = null

  function sync(): void {
    value.value = readKeys(
      toValue(sheet),
      options.mapName,
      toValue(options.entryId),
      spec,
    )
  }

  function bind(): void {
    handle?.teardown()
    const s = toValue(sheet)
    const id = toValue(options.entryId)
    const yMap = resolveYMapEntry(s, options.mapName, id)
    handle = attachYMapObserver(yMap, sync, watchedKeys)
  }

  watch(
    () => [toValue(sheet), toValue(options.entryId)] as const,
    bind,
    { immediate: true },
  )
  onScopeDispose(() => handle?.teardown())

  return value
}

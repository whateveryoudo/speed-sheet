import type { MaybeRefOrGetter, Ref } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import { useYMapKeys } from './useYMapKeys'

/** ydoc.sheets[sheetId] 上常见的 UI 元数据字段 */
export interface SheetYMapFields {
  name: string
  color: string
  hidden: number | undefined
}

export type SheetYMapPick<T extends keyof SheetYMapFields> = Pick<SheetYMapFields, T>

/**
 * 订阅当前工作表在 ydoc.sheets[sheetId] 上的多个字段。
 * 新增 UI 字段时扩展 SheetYMapFields，调用处 pick 需要的 key 即可。
 *
 * @example
 * const { color, name } = useSheetYMap(sheet, sheetId, { color: '', name: '' }).value
 * // 或解构 ref：const meta = useSheetYMap(...); meta.value.color
 */
export function useSheetYMap<T extends keyof SheetYMapFields>(
  sheet: MaybeRefOrGetter<Sheet | null>,
  sheetId: MaybeRefOrGetter<string>,
  pick: SheetYMapPick<T>,
): Ref<SheetYMapPick<T>> {
  return useYMapKeys(sheet, { mapName: 'sheets', entryId: sheetId }, pick)
}

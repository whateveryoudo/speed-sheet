import type { Sheet } from '@speed-sheet/core'
import { computeHiddenRows } from './evaluate'
import { syncSheetFilterView } from './filter-view'
import {
  clearPrivateFilterFromYdoc,
  readPrivateFilterFromYdoc,
  writePrivateFilterToYdoc,
} from './persist'
import type { FilterExtensionStorage, FilterSession } from './types'
import { getUserIdFromStorage } from './user-id'

function applySession(
  sheet: Sheet,
  storage: FilterExtensionStorage,
  session: FilterSession,
): void {
  storage.session = session
  storage.hiddenRows = session.active
    ? computeHiddenRows(sheet.state, session)
    : new Set<number>()
  syncSheetFilterView(sheet, storage)
}

/** 将当前用户的私有筛选写入 Y.Doc（不影响其他用户条目） */
export function persistPrivateFilterToYdoc(
  sheet: Sheet,
  storage: FilterExtensionStorage,
): void {
  const session = storage.session
  if (!session?.active || session.visibleToAll) return
  const userId = getUserIdFromStorage(storage)
  writePrivateFilterToYdoc(sheet.state, userId, { ...session, visibleToAll: false })
}

export function clearCurrentUserPrivateFilter(
  sheet: Sheet,
  storage: FilterExtensionStorage,
): void {
  const userId = getUserIdFromStorage(storage)
  clearPrivateFilterFromYdoc(sheet.state, userId)
}

/** 读取并应用当前用户在 Y.Doc 中的私有筛选 */
export function restorePrivateFilterFromYdoc(
  sheet: Sheet,
  storage: FilterExtensionStorage,
): boolean {
  const userId = getUserIdFromStorage(storage)
  const session = readPrivateFilterFromYdoc(sheet.state, userId)
  if (!session?.active) return false
  applySession(sheet, storage, { ...session, visibleToAll: false })
  return true
}

import type { Sheet } from '@speed-sheet/core'
import type * as Y from 'yjs'
import { computeHiddenRows } from './evaluate'
import { syncSheetFilterView } from './filter-view'
import {
  FILTER_PRIVATE_YDOC_KEY,
  FILTER_YDOC_KEY,
  readFilterSessionFromYdoc,
} from './persist'
import { restorePrivateFilterFromYdoc } from './private-ydoc'
import type { FilterExtensionStorage } from './types'

function getSheetRoot(sheet: Sheet): Y.Map<unknown> | null {
  const root = sheet.state?.root
  return root ?? null
}

/**
 * 决定画布生效的筛选：
 * 1. 有共享 → 全员看共享
 * 2. 无共享 → 当前登录用户看自己的 privateFilters[userId]
 */
export function applyEffectiveFilterView(sheet: Sheet, storage: FilterExtensionStorage): void {
  if (!getSheetRoot(sheet)) return
  const shared = readFilterSessionFromYdoc(sheet.state)
  if (shared?.active) {
    storage.session = shared
    storage.hiddenRows = computeHiddenRows(sheet.state, shared)
    syncSheetFilterView(sheet, storage)
    return
  }

  storage.session = null
  storage.hiddenRows = new Set()
  syncSheetFilterView(sheet, storage)
  restorePrivateFilterFromYdoc(sheet, storage)
}

export function bindFilterYdocSync(
  sheet: Sheet,
  storage: FilterExtensionStorage,
): () => void {
  const root = getSheetRoot(sheet)
  if (!root) return () => {}

  const handler = (event: Y.YMapEvent<unknown>) => {
    if (
      !event.keysChanged.has(FILTER_YDOC_KEY) &&
      !event.keysChanged.has(FILTER_PRIVATE_YDOC_KEY)
    ) {
      return
    }
    applyEffectiveFilterView(sheet, storage)
  }
  root.observe(handler)
  applyEffectiveFilterView(sheet, storage)
  return () => root.unobserve(handler)
}

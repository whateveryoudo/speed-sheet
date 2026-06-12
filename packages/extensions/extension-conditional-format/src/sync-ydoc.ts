import type { Sheet } from '@speed-sheet/core'
import type * as Y from 'yjs'
import { readCfRulesFromYdoc } from './persist'
import { CF_YDOC_KEY } from './persist'
import type { ConditionalFormatExtensionStorage } from './types'

function getSheetRoot(sheet: Sheet): Y.Map<unknown> | null {
  return sheet.state?.root ?? null
}

export function applyCfFromYdoc(sheet: Sheet, storage: ConditionalFormatExtensionStorage): void {
  if (!getSheetRoot(sheet)) return
  storage.rules = readCfRulesFromYdoc(sheet.state)
}

export function bindCfYdocSync(
  sheet: Sheet,
  storage: ConditionalFormatExtensionStorage,
): () => void {
  const root = getSheetRoot(sheet)
  if (!root) return () => {}

  const handler = (event: Y.YMapEvent<unknown>) => {
    if (!event.keysChanged.has(CF_YDOC_KEY)) return
    applyCfFromYdoc(sheet, storage)
    sheet.notifyUpdate()
  }

  root.observe(handler)
  applyCfFromYdoc(sheet, storage)
  return () => root.unobserve(handler)
}

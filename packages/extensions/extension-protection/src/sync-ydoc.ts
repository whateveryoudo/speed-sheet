import type { Sheet } from '@speed-sheet/core'
import type * as Y from 'yjs'
import { readProtectionEntriesFromYdoc } from './persist'
import { PROTECTION_YDOC_KEY } from './persist'
import type { ProtectionExtensionStorage } from './types'

function getSheetRoot(sheet: Sheet): Y.Map<unknown> | null {
  return sheet.state?.root ?? null
}

export function applyProtectionFromYdoc(sheet: Sheet, storage: ProtectionExtensionStorage): void {
  if (!getSheetRoot(sheet)) return
  storage.entries = readProtectionEntriesFromYdoc(sheet.state)
}

export function bindProtectionYdocSync(
  sheet: Sheet,
  storage: ProtectionExtensionStorage,
): () => void {
  const root = getSheetRoot(sheet)
  if (!root) return () => {}

  const handler = (event: Y.YMapEvent<unknown>) => {
    if (!event.keysChanged.has(PROTECTION_YDOC_KEY)) return
    applyProtectionFromYdoc(sheet, storage)
    sheet.notifyUpdate()
  }

  root.observe(handler)
  applyProtectionFromYdoc(sheet, storage)
  return () => root.unobserve(handler)
}

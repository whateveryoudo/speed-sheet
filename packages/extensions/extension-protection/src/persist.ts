import type { SheetState } from '@speed-sheet/core'
import { transactUser } from '@speed-sheet/core'
import type { ProtectionEntry } from './types'

export const PROTECTION_YDOC_KEY = 'sheetProtections'

function isProtectionEntry(raw: unknown): raw is ProtectionEntry {
  if (!raw || typeof raw !== 'object') return false
  const e = raw as ProtectionEntry
  return (
    typeof e.id === 'string' &&
    (e.kind === 'rows' || e.kind === 'cols' || e.kind === 'cells') &&
    Array.isArray(e.row) &&
    e.row.length === 2 &&
    Array.isArray(e.column) &&
    e.column.length === 2
  )
}

export function deserializeProtectionEntries(raw: unknown): ProtectionEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isProtectionEntry).map((e) => ({
    id: e.id,
    kind: e.kind,
    row: [Math.min(e.row[0], e.row[1]), Math.max(e.row[0], e.row[1])] as [number, number],
    column: [Math.min(e.column[0], e.column[1]), Math.max(e.column[0], e.column[1])] as [
      number,
      number,
    ],
  }))
}

export function readProtectionEntriesFromYdoc(state: SheetState): ProtectionEntry[] {
  return deserializeProtectionEntries(state.root.get(PROTECTION_YDOC_KEY))
}

export function writeProtectionEntriesToYdoc(
  state: SheetState,
  entries: ProtectionEntry[],
): void {
  const doc = state.root.doc
  if (!doc) return
  transactUser(doc, () => {
    if (entries.length === 0) {
      if (state.root.has(PROTECTION_YDOC_KEY)) state.root.delete(PROTECTION_YDOC_KEY)
      return
    }
    state.root.set(PROTECTION_YDOC_KEY, JSON.parse(JSON.stringify(entries)))
  })
}

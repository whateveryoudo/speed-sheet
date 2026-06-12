import {
  Extension,
  type CommandContext,
  type CommandBlockedEvent,
  type Sheet,
} from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'
import { isCommandBlockedByProtection } from './command-guard'
import {
  createProtectionEntry,
  normalizeRect,
  rangeOverlapsProtection,
  selectionOverlapsProtection,
} from './range'
import { writeProtectionEntriesToYdoc } from './persist'
import { applyProtectionFromYdoc, bindProtectionYdocSync } from './sync-ydoc'
import {
  PROTECTION_EXTENSION_NAME,
  type ProtectionExtensionStorage,
  type ProtectionEntry,
} from './types'

function rebindProtectionYdocSync(sheet: Sheet, storage: ProtectionExtensionStorage): void {
  storage._unbindYdoc?.()
  storage._unbindYdoc = bindProtectionYdocSync(sheet, storage)
}

function persistEntries(state: CommandContext['state'], entries: ProtectionEntry[]): void {
  writeProtectionEntriesToYdoc(state, entries)
}

function notifyBlocked(sheet: Sheet, event: CommandBlockedEvent): void {
  sheet.notifyCommandBlocked(event)
}

function selectionBounds(state: CommandContext['state']) {
  const sel = state.getSelection()
  return normalizeRect(sel.row, sel.column)
}

function fullRowBounds(state: CommandContext['state'], row: [number, number]) {
  const { r0, r1 } = normalizeRect(row, row)
  const colCount = Math.max(0, state.getColCount() - 1)
  return { r0, r1, c0: 0, c1: colCount }
}

function fullColBounds(state: CommandContext['state'], column: [number, number]) {
  const { c0, c1 } = normalizeRect(column, column)
  const rowCount = Math.max(0, state.getRowCount() - 1)
  return { r0: 0, r1: rowCount, c0, c1 }
}

function addProtectionFromSelection(
  sheet: Sheet,
  storage: ProtectionExtensionStorage,
  state: CommandContext['state'],
  kind: ProtectionEntry['kind'],
): boolean {
  const sel = state.getSelection()
  let bounds: { r0: number; r1: number; c0: number; c1: number }

  if (kind === 'rows') {
    bounds = fullRowBounds(state, sel.row)
  } else if (kind === 'cols') {
    bounds = fullColBounds(state, sel.column)
  } else {
    bounds = selectionBounds(state)
  }

  if (selectionOverlapsProtection(storage.entries, [bounds.r0, bounds.r1], [bounds.c0, bounds.c1])) {
    notifyBlocked(sheet, { reason: 'already_protected', command: `protect${kind}` })
    return false
  }

  const entry = createProtectionEntry(
    kind,
    [bounds.r0, bounds.r1],
    [bounds.c0, bounds.c1],
  )
  storage.entries = [...storage.entries, entry]
  persistEntries(state, storage.entries)
  return true
}

export const ProtectionExtension = Extension.create<ProtectionExtensionStorage>({
  name: PROTECTION_EXTENSION_NAME,
  priority: -35,

  addStorage() {
    return {
      entries: [],
      _activeSheetId: '0',
      _sheet: null,
      _unbindYdoc: null,
    }
  },

  onInit(sheet: Sheet) {
    const storage = this.storage
    storage._sheet = sheet
    storage._activeSheetId = sheet.getActiveSheetId()
    sheet.setCommandGuard((name, props, ctx) => {
      if (!storage.entries.length) return true
      if (isCommandBlockedByProtection(name, props, ctx, storage.entries)) {
        notifyBlocked(sheet, { reason: 'protected', command: name })
        return false
      }
      return true
    })
    queueMicrotask(() => {
      if (storage._sheet !== sheet) return
      rebindProtectionYdocSync(sheet, storage)
    })
  },

  onDestroy(this: Extension<ProtectionExtensionStorage>) {
    this.storage._unbindYdoc?.()
    this.storage._unbindYdoc = null
    this.storage._sheet?.setCommandGuard(null)
  },

  onSheetSwitch(this: Extension<ProtectionExtensionStorage>, sheetId: string) {
    const storage = this.storage
    const sheet = storage._sheet
    storage._activeSheetId = sheetId
    storage.entries = []
    if (sheet) {
      rebindProtectionYdocSync(sheet, storage)
    }
  },

  addCommands({ sheet }) {
    const storage = this.storage

    return {
      protectRows: () => {
        return ({ state }: CommandContext) => addProtectionFromSelection(sheet, storage, state, 'rows')
      },

      protectCols: () => {
        return ({ state }: CommandContext) => addProtectionFromSelection(sheet, storage, state, 'cols')
      },

      protectCells: () => {
        return ({ state }: CommandContext) => addProtectionFromSelection(sheet, storage, state, 'cells')
      },

      unprotectEntry: (props: { id: string }) => {
        return ({ state }: CommandContext) => {
          const next = storage.entries.filter((entry) => entry.id !== props.id)
          if (next.length === storage.entries.length) return false
          storage.entries = next
          persistEntries(state, next)
          return true
        }
      },
    }
  },
})

export function getProtectionExtensionStorage(
  sheet: { extensions: Extension[] },
): ProtectionExtensionStorage | null {
  const ext = sheet.extensions.find((e) => e.name === PROTECTION_EXTENSION_NAME)
  if (!ext) return null
  return ext.storage as ProtectionExtensionStorage
}

export function getProtectionEntries(sheet: { extensions: Extension[] }): ProtectionEntry[] {
  return getProtectionExtensionStorage(sheet)?.entries ?? []
}

export function isCellProtected(sheet: { extensions: Extension[] }, r: number, c: number): boolean {
  const entries = getProtectionEntries(sheet)
  if (!entries.length) return false
  return rangeOverlapsProtection(entries, r, r, c, c)
}

export function isSelectionProtected(sheet: Sheet, selection?: Selection): boolean {
  const entries = getProtectionEntries(sheet)
  if (!entries.length) return false
  const sel = selection ?? sheet.state.getSelection()
  return selectionOverlapsProtection(entries, sel.row, sel.column)
}

export { applyProtectionFromYdoc }

export const PROTECTION_EXTENSION_NAME = 'sheetProtection'

export type ProtectionKind = 'rows' | 'cols' | 'cells'

export interface ProtectionEntry {
  id: string
  kind: ProtectionKind
  row: [number, number]
  column: [number, number]
}

export interface ProtectionExtensionStorage {
  entries: ProtectionEntry[]
  _activeSheetId: string
  _sheet: import('@speed-sheet/core').Sheet | null
  _unbindYdoc: (() => void) | null
}

export type ProtectionBlockReason = 'protected' | 'already_protected'

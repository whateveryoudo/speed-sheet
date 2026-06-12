export {
  ProtectionExtension,
  getProtectionExtensionStorage,
  getProtectionEntries,
  isCellProtected,
  isSelectionProtected,
  applyProtectionFromYdoc,
} from './extension'
export { formatProtectionLabel } from './label'
export {
  PROTECTION_EXTENSION_NAME,
  type ProtectionEntry,
  type ProtectionKind,
  type ProtectionExtensionStorage,
  type ProtectionBlockReason,
} from './types'
export { PROTECTION_YDOC_KEY } from './persist'
export {
  isCellProtected as isCellProtectedInEntries,
  rangeOverlapsProtection,
  selectionOverlapsProtection,
} from './range'
export { isCommandBlockedByProtection } from './command-guard'

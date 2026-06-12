/**
 * Extension system (TipTap-style)
 *
 * - `Extension.ts` — base class & config types
 * - `core/*` — built-in extensions (always loaded)
 * - Optional plugins live in `packages/extensions/*`
 */

export { Extension } from './Extension'
export type { ExtensionConfig } from './Extension'

export type {
  CommandFn,
  CommandContext,
  CommandChain,
  ExtensionCommandContext,
  KeyboardShortcutHandler,
} from './types'

export {
  KeyboardExtension,
  SelectionExtension,
  HistoryExtension,
  ClipboardExtension,
  CellEditingExtension,
  RowColExtension,
  MergeExtension,
  CellInsertExtension,
  FreezeExtension,
  CORE_EXTENSIONS,
} from './core'

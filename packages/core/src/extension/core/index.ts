import { KeyboardExtension } from './keyboard'
import { SelectionExtension } from './selection'
import { HistoryExtension } from './history'
import { ClipboardExtension } from './clipboard'
import { CellEditingExtension } from './cell-editing'

export {
  KeyboardExtension,
  SelectionExtension,
  HistoryExtension,
  ClipboardExtension,
  CellEditingExtension,
}

/** Built-in extensions always loaded by Sheet */
export const CORE_EXTENSIONS = [
  KeyboardExtension,
  SelectionExtension,
  HistoryExtension,
  ClipboardExtension,
  CellEditingExtension,
]

import { KeyboardExtension } from './keyboard'
import { SelectionExtension } from './selection'
import { HistoryExtension } from './history'
import { ClipboardExtension } from './clipboard'
import { CellEditingExtension } from './cell-editing'
import { RowColExtension } from './row-col'

export {
  KeyboardExtension,
  SelectionExtension,
  HistoryExtension,
  ClipboardExtension,
  CellEditingExtension,
  RowColExtension,
}

/** Built-in extensions always loaded by Sheet */
export const CORE_EXTENSIONS = [
  KeyboardExtension,
  SelectionExtension,
  HistoryExtension,
  ClipboardExtension,
  CellEditingExtension,
  RowColExtension,
]

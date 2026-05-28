import { Extension } from '../Extension'
import type { CommandContext } from '../types'
import type { Sheet } from '../../Sheet'
import { createSheetUndoManager, type SheetHistoryStorage } from '../../yjs/undo-manager'

export const HistoryExtension = Extension.create<SheetHistoryStorage>({
  name: 'history',
  priority: -98,

  addStorage() {
    return {
      undoManager: null,
    }
  },

  onInit(this: Extension<SheetHistoryStorage>, sheet: Sheet) {
    const um = createSheetUndoManager(sheet.ydoc)
    this.storage.undoManager = um

    const bump = () => sheet.notifyUpdate()
    um.on('stack-item-added', bump)
    um.on('stack-item-popped', bump)
    um.on('stack-cleared', bump)
  },

  onDestroy(this: Extension<SheetHistoryStorage>) {
    this.storage.undoManager?.destroy()
    this.storage.undoManager = null
  },

  addCommands() {
    const storage = this.storage

    return {
      undo: () => {
        return (_ctx: CommandContext) => {
          const um = storage.undoManager
          if (!um || um.undoStack.length === 0) return false
          um.undo()
          return true
        }
      },
      redo: () => {
        return (_ctx: CommandContext) => {
          const um = storage.undoManager
          if (!um || um.redoStack.length === 0) return false
          um.redo()
          return true
        }
      },
    }
  },
})

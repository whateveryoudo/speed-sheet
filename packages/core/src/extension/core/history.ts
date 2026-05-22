import { Extension } from '../Extension'
import type { CommandContext } from '../types'

export const HistoryExtension = Extension.create({
  name: 'history',
  priority: -98,

  addStorage() {
    return {
      undoStack: [] as any[],
      redoStack: [] as any[],
      maxStack: 100,
    }
  },

  addCommands() {
    return {
      undo: () => {
        return (_ctx: CommandContext) => {
          // TODO: wire Yjs UndoManager
          return true
        }
      },
      redo: () => {
        return (_ctx: CommandContext) => {
          return true
        }
      },
    }
  },
})

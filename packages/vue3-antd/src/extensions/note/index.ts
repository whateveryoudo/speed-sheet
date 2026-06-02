import { Extension } from '@speed-sheet/core'
import { VueSheetBubbleRenderer } from '@speed-sheet/vue3'
import NoteMenusHost from '../../bubbleMenus/noteMenus/index.vue'
import { removeNotesInSelection } from './selection'

export const NOTE_EXTENSION_NAME = 'sheetNote'

export const SheetNote = Extension.create({
  name: NOTE_EXTENSION_NAME,
  priority: -45,

  addBubbleMenu() {
    return VueSheetBubbleRenderer(NoteMenusHost)
  },

  addKeyboardShortcuts({ sheet }) {
    const remove = () => removeNotesInSelection(sheet)
    return {
      Backspace: remove,
      Delete: remove,
    }
  },
})

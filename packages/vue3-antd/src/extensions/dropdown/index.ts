import { Extension } from '@speed-sheet/core'
import { VueSheetBubbleRenderer } from '@speed-sheet/vue3'
import DropdownMenusHost from '../../bubbleMenus/dropdownMenus/index.vue'
import { removeDropdownsInSelection } from './selection'

export const DROPDOWN_EXTENSION_NAME = 'sheetDropdown'

export const SheetDropdown = Extension.create({
  name: DROPDOWN_EXTENSION_NAME,
  priority: -43,

  addBubbleMenu() {
    return VueSheetBubbleRenderer(DropdownMenusHost)
  },

  addKeyboardShortcuts({ sheet }) {
    const remove = () => removeDropdownsInSelection(sheet)
    return {
      Backspace: remove,
      Delete: remove,
    }
  },
})

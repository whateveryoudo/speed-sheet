import { Extension } from '@speed-sheet/core'
import { VueSheetBubbleRenderer } from '@speed-sheet/vue3'
import LinkMenusHost from '../../bubbleMenus/linkMenus/index.vue'
import { removeLinksInSelection } from './selection'

export const LINK_EXTENSION_NAME = 'sheetLink'

export const SheetLink = Extension.create({
  name: LINK_EXTENSION_NAME,
  priority: -44,

  addBubbleMenu() {
    return VueSheetBubbleRenderer(LinkMenusHost)
  },

  addKeyboardShortcuts({ sheet }) {
    const remove = () => removeLinksInSelection(sheet)
    return {
      Backspace: remove,
      Delete: remove,
    }
  },
})

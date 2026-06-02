import { FilterExtension, FILTER_EXTENSION_NAME } from '@speed-sheet/extension-filter'
import { VueSheetBubbleRenderer } from '@speed-sheet/vue3'
import FilterConfigMenu from '../../bubbleMenus/filterConfigMenu/index.vue'

export { FILTER_EXTENSION_NAME }

export const SheetFilter = FilterExtension.extend({
  name: FILTER_EXTENSION_NAME,

  addBubbleMenu() {
    return VueSheetBubbleRenderer(FilterConfigMenu)
  },
})

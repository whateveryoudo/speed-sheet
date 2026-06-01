/**
 * 对标 speed-tiptap-editor/src/extensions/image
 * - Layer.vue：NodeView，注册 downloadImage（useCustomUpload）
 * - bubbleMenus/imageMenu：气泡 UI
 */
import { ImageExtension, IMAGE_EXTENSION_NAME } from '@speed-sheet/extension-image'
import { VueSheetBubbleRenderer, VueSheetOverlayRenderer } from '@speed-sheet/vue3'
import ImageBubbleMenu from '../../bubbleMenus/imageMenu/index.vue'
import ImageLayer from './Layer.vue'

export { useSheetImageInsert } from './insert'

export const SheetImage = ImageExtension.extend({
  name: IMAGE_EXTENSION_NAME,

  addNodeView() {
    return VueSheetOverlayRenderer(ImageLayer)
  },

  addBubbleMenu() {
    return VueSheetBubbleRenderer(ImageBubbleMenu)
  },
})

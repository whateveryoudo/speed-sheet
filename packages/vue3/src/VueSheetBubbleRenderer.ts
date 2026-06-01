import type { Extension } from '@speed-sheet/core'
import type { Component, Ref } from 'vue'
import { defineComponent, h } from 'vue'

export interface SheetBubbleViewProps {
  extension: Extension
  boundary: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}

/**
 * 对标 @tiptap/vue-3 BubbleMenu + VueNodeViewRenderer：
 * 扩展 `addBubbleMenu()` 登记气泡 UI，由 SheetBubbleMenusHost 挂载。
 */
export function VueSheetBubbleRenderer(component: Component): Component {
  const normalized =
    typeof component === 'function' && '__vccOpts' in component
      ? (component as { __vccOpts: Component }).__vccOpts
      : component

  return defineComponent({
    name: 'SheetBubbleMenuHost',
    props: {
      extension: {
        type: Object,
        required: true,
      },
      boundary: {
        type: [Object, HTMLElement] as unknown as () => HTMLElement | null,
        default: null,
      },
    },
    setup(props: SheetBubbleViewProps) {
      return () =>
        h(normalized, {
          extension: props.extension,
          boundary: props.boundary,
        })
    },
  })
}

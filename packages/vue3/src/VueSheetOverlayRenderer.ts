import type { Extension } from '@speed-sheet/core'
import type { Component } from 'vue'
import { defineComponent, h } from 'vue'

/** 传给 overlay NodeView 的 props（对标 tiptap NodeViewProps 中的 extension） */
export interface SheetOverlayViewProps {
  extension: Extension
}

/**
 * 对标 [@tiptap/vue-3 VueNodeViewRenderer](https://github.com/ueberdosis/tiptap/blob/main/packages/vue-3/src/VueNodeViewRenderer.ts)：
 * 在扩展的 `addNodeView()` 中登记 Vue 组件，由 `SheetExtensionViews` 统一挂载到 viewport。
 *
 * 与 ProseMirror NodeView 的差异：表格图片是 floating overlay，不是文档树节点；
 * 因此不实现 PM 的 dom/contentDOM/update，只负责把 `extension` 注入子组件。
 */
export function VueSheetOverlayRenderer(component: Component): Component {
  const normalized =
    typeof component === 'function' && '__vccOpts' in component
      ? (component as { __vccOpts: Component }).__vccOpts
      : component

  return defineComponent({
    name: 'SheetOverlayViewHost',
    props: {
      extension: {
        type: Object,
        required: true,
      },
    },
    setup(props: SheetOverlayViewProps) {
      return () => h(normalized, { extension: props.extension })
    },
  })
}

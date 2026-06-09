<!--
  对标 speed-tiptap-editor/bubbleMenus/BubbleContainer.vue + @tiptap/vue-3 BubbleMenu
-->
<template>
  <SheetBubbleMenu
    :anchor-rect="anchorRect"
    :should-show="shouldShow"
    :boundary="resolveBoundary"
    :placement="placement"
    :offset="offset"
  >
    <div :class="['sheet-bubble-menu-wrapper', bubbleClassName || '']">
      <slot />
    </div>
  </SheetBubbleMenu>
</template>

<script setup lang="ts">
import { type ComputedRef, type Ref } from 'vue'
import { SheetBubbleMenu, type SheetBubbleAnchorRect } from '@speed-sheet/vue3'

const props = withDefaults(
  defineProps<{
    bubbleClassName?: string
    shouldShow: () => boolean
    anchorRect:
      | Ref<SheetBubbleAnchorRect | null>
      | ComputedRef<SheetBubbleAnchorRect | null>
      | SheetBubbleAnchorRect
      | null
    boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
    placement?:
      | 'top'
      | 'bottom'
      | 'top-start'
      | 'bottom-start'
      | 'right'
      | 'right-start'
      | 'left'
      | 'left-start'
    offset?: number
  }>(),
  {
    placement: 'bottom',
  },
)

const resolveBoundary = () => {
  const b = props.boundary
  if (!b) return null
  if (typeof b === 'object' && b !== null && 'value' in b) {
    return (b as Ref<HTMLElement | null | undefined>).value ?? null
  }
  return b as HTMLElement
}
</script>

<style scoped lang="less">
.sheet-bubble-menu-wrapper {
  padding: 4px 6px;
  background: var(--ant-color-bg-elevated);
  border-radius: var(--ant-border-radius);
  box-shadow: var(--ant-box-shadow-secondary);
}
</style>

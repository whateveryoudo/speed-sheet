<template>
  <div
    v-show="visible"
    ref="menuEl"
    class="sheet-bubble-menu-host"
    @mousedown.stop
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { type Ref, watch } from 'vue'
import {
  useSheetBubbleFloating,
  type SheetBubbleAnchorRect,
} from '../composables/useSheetBubbleFloating'

const props = withDefaults(
  defineProps<{
    anchorRect: Ref<SheetBubbleAnchorRect | null> | SheetBubbleAnchorRect | null
    shouldShow: () => boolean
    boundary?: HTMLElement | null | (() => HTMLElement | null)
    placement?: 'top' | 'bottom' | 'top-start' | 'bottom-start'
    offset?: number
  }>(),
  {
    placement: 'bottom',
  },
)

function resolveAnchorRef(): Ref<SheetBubbleAnchorRect | null> {
  const ar = props.anchorRect
  if (ar && typeof ar === 'object' && 'value' in ar) {
    return ar as Ref<SheetBubbleAnchorRect | null>
  }
  return {
    get value() {
      return (props.anchorRect as SheetBubbleAnchorRect | null) ?? null
    },
  } as Ref<SheetBubbleAnchorRect | null>
}

function resolveBoundaryRef(): Ref<HTMLElement | null | undefined> {
  const b = props.boundary
  return {
    get value() {
      return typeof b === 'function' ? b() : b ?? null
    },
  } as Ref<HTMLElement | null | undefined>
}

const { visible, menuEl, syncVisible } = useSheetBubbleFloating({
  anchorRect: resolveAnchorRef(),
  shouldShow: props.shouldShow,
  boundary: resolveBoundaryRef(),
  placement: props.placement,
  offset: props.offset,
})

watch(
  () => [props.boundary, props.anchorRect] as const,
  () => {
    void syncVisible()
  },
  { deep: true },
)

defineExpose({ menuEl, syncVisible })
</script>

<style scoped>
.sheet-bubble-menu-host {
  pointer-events: auto;
}
</style>

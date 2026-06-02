<template>
  <BubbleContainer
    :should-show="shouldShow"
    :anchor-rect="anchorRectRef"
    :boundary="boundary"
    placement="bottom-start"
    :offset="2"
  >
    <FilterConfigPanel :sheet="sheet ?? null" @cancel="closePanel" @done="closePanel" />
  </BubbleContainer>
</template>

<script setup lang="ts">
import { computed, type ComputedRef, type Ref } from 'vue'
import { cellRect } from '@speed-sheet/core'
import type { Extension } from '@speed-sheet/core'
import { useSheetViewport, type SheetBubbleAnchorRect } from '@speed-sheet/vue3'
import { useFilterConfigPanel } from '../../composables/useFilterConfigPanel'
import BubbleContainer from '../BubbleContainer.vue'
import FilterConfigPanel from './FilterConfigPanel.vue'

defineProps<{
  extension: Extension
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()

const { open, anchor: panelAnchor, closePanel } = useFilterConfigPanel()
const { sheet, revision, layout, scrollX, scrollY, viewportTick } = useSheetViewport()

const anchorRectRef = computed((): SheetBubbleAnchorRect | null => {
  void revision.value
  void viewportTick.value
  const s = sheet.value
  if (!s || !open.value) return null
  const { r, c } = panelAnchor
  const mc = s.createMergeContext()
  const rect = cellRect(r, c, layout.value, mc)
  return {
    left: rect.x - scrollX.value,
    top: rect.y - scrollY.value,
    width: rect.w,
    height: rect.h,
  }
}) as ComputedRef<SheetBubbleAnchorRect | null>

const shouldShow = () => open.value && !!sheet.value && !!anchorRectRef.value
</script>

<template>
  <BubbleContainer
    :should-show="shouldShow"
    :anchor-rect="anchorRectRef"
    :boundary="boundary"
    placement="right-start"
    :offset="2"
  >
    <div @mousedown.stop>
      <NoteConfigPanel
        ref="panelRef"
        :sheet="sheet ?? null"
        :r="panelAnchor.r"
        :c="panelAnchor.c"
        :apply-selection="applySelection"
        @cancel="onPanelCancel"
        @done="onPanelDone"
      />
    </div>
  </BubbleContainer>
</template>

<script setup lang="ts">
import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import {
  buildSheetGridMetrics,
  cellViewportRect,
  shouldHideAtFreezeSplit,
} from '@speed-sheet/core'
import type { Extension } from '@speed-sheet/core'
import { useSheetViewport, type SheetBubbleAnchorRect } from '@speed-sheet/vue3'
import { useNoteConfigPanel } from '../../composables/useNoteConfigPanel'
import BubbleContainer from '../BubbleContainer.vue'
import NoteConfigPanel from './NoteConfigPanel.vue'

defineProps<{
  extension: Extension
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()

const panelRef = ref<{ commit: () => void } | null>(null)
const {
  open,
  editing,
  anchor: panelAnchor,
  applySelection,
  closePanel,
  registerCommit,
} = useNoteConfigPanel()
const { sheet, revision, layout, scrollX, scrollY, viewportTick } = useSheetViewport()

watch(
  () => panelRef.value,
  (panel) => {
    if (panel) registerCommit(() => panel.commit())
  },
  { immediate: true },
)

function onPanelCancel(): void {
  open.value = false
}

function onPanelDone(): void {
  open.value = false
}

function noteViewportRect(): SheetBubbleAnchorRect | null {
  const s = sheet.value
  if (!s || !open.value) return null
  const { r, c } = panelAnchor
  const mc = s.createMergeContext()
  const L = layout.value
  const metrics = buildSheetGridMetrics(s, L)
  const rect = cellViewportRect(r, c, L, mc)
  if (shouldHideAtFreezeSplit(r, c, rect, L, metrics)) return null
  return {
    left: rect.x,
    top: rect.y,
    width: rect.w,
    height: rect.h,
  }
}

const anchorRectRef = computed((): SheetBubbleAnchorRect | null => {
  void revision.value
  void viewportTick.value
  void scrollX.value
  void scrollY.value
  return noteViewportRect()
}) as ComputedRef<SheetBubbleAnchorRect | null>

const shouldShow = () => open.value && !!sheet.value && !!anchorRectRef.value

watch([scrollX, scrollY, layout, viewportTick, open], () => {
  if (!open.value || editing.value) return
  if (!noteViewportRect()) closePanel()
})
</script>

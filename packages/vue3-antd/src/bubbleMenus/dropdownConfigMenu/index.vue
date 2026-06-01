<!--
  下拉列表配置气泡：由 SheetDropdown 扩展 addBubbleMenu 登记，SheetBubbleMenusHost 挂载。
  外观由 BubbleContainer 统一提供 padding / 背景 / 阴影，此处勿再覆盖 bubbleClassName。
-->
<template>
  <BubbleContainer
    :should-show="shouldShow"
    :anchor-rect="anchorRectRef"
    :boundary="boundary"
    placement="bottom-start"
    :offset="2"
  >
    <DropdownListPanel
      :sheet="sheet ?? null"
      :r="panelAnchor.r"
      :c="panelAnchor.c"
      apply-selection
      @cancel="closePanel"
      @done="closePanel"
    />
  </BubbleContainer>
</template>

<script setup lang="ts">
import { computed, watch, type ComputedRef, type Ref } from 'vue'
import { cellRect } from '@speed-sheet/core'
import type { Extension } from '@speed-sheet/core'
import { useSheetViewport, type SheetBubbleAnchorRect } from '@speed-sheet/vue3'
import { useDropdownConfigPanel } from '../../composables/useDropdownConfigPanel'
import BubbleContainer from '../BubbleContainer.vue'
import DropdownListPanel from './DropdownListPanel.vue'

defineProps<{
  extension: Extension
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()

const { open, anchor: panelAnchor, closePanel } = useDropdownConfigPanel()
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

watch(
  () => {
    void revision.value
    const s = sheet.value
    if (!s || !open.value) return null
    const sel = s.state.getSelection()
    return {
      r0: sel.row[0],
      r1: sel.row[1],
      c0: sel.column[0],
      c1: sel.column[1],
      ar: panelAnchor.r,
      ac: panelAnchor.c,
    }
  },
  (sel) => {
    if (!sel || !open.value) return
    const single = sel.r0 === sel.r1 && sel.c0 === sel.c1
    if (!single || sel.r0 !== sel.ar || sel.c0 !== sel.ac) closePanel()
  },
)
</script>

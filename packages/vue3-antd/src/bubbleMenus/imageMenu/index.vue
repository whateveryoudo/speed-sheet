<!--
  对标 speed-tiptap-editor/bubbleMenus/imageMenu/index.vue
-->
<template>
  <BubbleContainer
    :should-show="shouldShow"
    :anchor-rect="anchorRectRef"
    :boundary="boundary"
  >
    <a-space :size="4">
      <a-tooltip title="预览">
        <div class="shadow-bg-wrapper" @click="previewImage">
          <eye-outlined />
        </div>
      </a-tooltip>
      <a-tooltip v-if="uploadApis?.fileDownload" title="下载">
        <div class="shadow-bg-wrapper" @click="downloadImage">
          <download-outlined />
        </div>
      </a-tooltip>
      <a-tooltip title="删除">
        <div class="shadow-bg-wrapper" @click="removeImage">
          <delete-outlined />
        </div>
      </a-tooltip>
    </a-space>
  </BubbleContainer>
</template>

<script setup lang="ts">
import { computed, type ComputedRef, type Ref } from 'vue'
import { DeleteOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons-vue'
import { computeCellImageBubbleAnchor } from '@speed-sheet/extension-image'
import { useSheetUploadConfig, useSheetViewport, type SheetBubbleAnchorRect } from '@speed-sheet/vue3'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useSpeedSheet } from '../../composables/useSpeedSheet'
import BubbleContainer from '../BubbleContainer.vue'

defineProps<{
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()

const { previewInstance } = useSpeedSheet()
const { sheet, layout, scrollX, scrollY, viewportTick } = useSheetViewport()
const { editableCpt, revision, selection, anchorRc } = useSheetToolbar()
const uploadCfg = useSheetUploadConfig()
const uploadApis = computed(() => uploadCfg.value.apis)

const isSingleCellSelected = computed(() => {
  void revision.value
  const sel = selection.value
  if (!sel) return false
  return sel.row[0] === sel.row[1] && sel.column[0] === sel.column[1]
})

const cellImage = computed(() => {
  void revision.value
  void viewportTick.value
  const s = sheet.value
  if (!s || !isSingleCellSelected.value) return null
  const { r, c } = anchorRc.value
  return s.state.getImagesAtCell(r, c)[0] ?? null
})

const anchorRectRef = computed((): SheetBubbleAnchorRect | null => {
  void viewportTick.value
  const s = sheet.value
  if (!s || !cellImage.value) return null
  const { r, c } = anchorRc.value
  return computeCellImageBubbleAnchor(s, layout.value, scrollX.value, scrollY.value, r, c)
}) as ComputedRef<SheetBubbleAnchorRect | null>

const shouldShow = () =>
  editableCpt.value && isSingleCellSelected.value && !!cellImage.value && !!anchorRectRef.value

function previewImage(): void {
  const src = cellImage.value?.src
  if (!src) return
  if (previewInstance.value) {
    previewInstance.value.previewImage(src)
    return
  }
  window.open(src, '_blank', 'noopener')?.focus()
}

function downloadImage(): void {
  const id = cellImage.value?.id
  if (!id) return
  sheet.value?.chain().downloadSheetImage({ id }).run()
}

function removeImage(): void {
  const id = cellImage.value?.id
  if (!id) return
  sheet.value?.chain().removeSheetImage({ id }).run()
}
</script>

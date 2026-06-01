<!--
  浮动图片层：不参与 pointer 命中；注册 downloadImage 供 downloadSheetImage 命令调用。
-->
<template>
  <div class="sheet-image-layer" aria-hidden="true">
    <div
      v-for="item in imageStyles"
      :key="item.id"
      class="sheet-cell-image"
      :style="item.style"
    >
      <img :src="item.src" :alt="item.id" draggable="false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import {
  computeSheetImageAnchorRect,
  sheetImageStyleFromAnchor,
  type SheetImageExtensionStorage,
} from '@speed-sheet/extension-image'
import type { Extension } from '@speed-sheet/core'
import { useCustomUpload } from 'speed-components-ui/hooks'
import { useSheetUploadConfig, useSheetViewport } from '@speed-sheet/vue3'

const props = defineProps<{
  extension: Extension<SheetImageExtensionStorage>
}>()

const { sheet, revision, layout, scrollX, scrollY, viewportTick } = useSheetViewport()
const uploadCfg = useSheetUploadConfig()

const uploadOptions = computed(() => ({
  apis: {
    fileUploadMulti: uploadCfg.value.apis?.fileUploadSingle ?? (async () => ({ success: false })),
    fileUploadSingle: uploadCfg.value.apis?.fileUploadSingle ?? (async () => ({ success: false })),
    fileDownload: uploadCfg.value.apis?.fileDownload,
  },
}))

const { handleDownloadFile } = useCustomUpload(uploadOptions)

onMounted(() => {
  props.extension.storage.downloadImage = (fileId: string) => {
    handleDownloadFile(fileId)
  }
})

onUnmounted(() => {
  props.extension.storage.downloadImage = undefined
})

const imageStyles = computed(() => {
  void revision.value
  void viewportTick.value
  const s = sheet.value
  if (!s) return [] as { id: string; src: string; style: Record<string, string> }[]
  return s.state.getAllImages().map((img) => {
    const anchor = computeSheetImageAnchorRect(
      s,
      layout.value,
      scrollX.value,
      scrollY.value,
      img,
    )
    return {
      id: img.id,
      src: img.src,
      style: sheetImageStyleFromAnchor(anchor),
    }
  })
})
</script>

<style scoped>
.sheet-image-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 4;
}

.sheet-cell-image {
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  border-radius: 2px;
  overflow: hidden;
  background: transparent;
}

.sheet-cell-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
</style>

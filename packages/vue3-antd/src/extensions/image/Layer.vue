<!--
  图片由 core renderSheet canvas 绘制（位于网格之上、表头/分割线之下）。
  本层仅注册 downloadImage 供 downloadSheetImage 命令调用。
-->
<template>
  <div class="sheet-image-layer" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import type { SheetImageExtensionStorage } from '@speed-sheet/extension-image'
import type { Extension } from '@speed-sheet/core'
import { useCustomUpload } from 'speed-components-ui/hooks'
import { useSheetUploadConfig } from '@speed-sheet/vue3'
import { computed } from 'vue'

const props = defineProps<{
  extension: Extension<SheetImageExtensionStorage>
}>()

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
</script>

<style scoped>
.sheet-image-layer {
  display: none;
}
</style>

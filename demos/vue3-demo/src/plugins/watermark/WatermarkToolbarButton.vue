<template>
  <button
    class="watermark-toolbar-btn"
    :class="{ 'is-active': isWatermarkVisible }"
    title="切换水印显示/隐藏"
    @click="handleClick"
  >
    <span class="btn-icon">💧</span>
    <span class="btn-text">水印</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSheetToolbar } from '@speed-sheet/vue3-antd'

const { sheet } = useSheetToolbar()

const isWatermarkVisible = computed(() => {
  const ext = sheet.value?.extensions.find((e) => e.name === 'watermark')
  return Boolean(ext?.storage?.visible)
})

function handleClick() {
  const s = sheet.value
  if (s?.commands.toggleWatermark) {
    s.commands.toggleWatermark()
  }
}
</script>

<style scoped>
.watermark-toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  color: #333;
  transition: all 0.2s;
}

.watermark-toolbar-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.watermark-toolbar-btn.is-active {
  background: #e6f7ff;
  border-color: #91d5ff;
  color: #1890ff;
}

.btn-icon {
  font-size: 13px;
}

.btn-text {
  font-weight: 500;
}
</style>

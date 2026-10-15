<template>
  <div v-if="storage?.visible" class="sheet-watermark-overlay">
    <div
      v-for="i in 12"
      :key="i"
      class="watermark-item"
      :style="{
        color: options.color || 'rgba(0, 0, 0, 0.08)',
        fontSize: `${options.fontSize || 20}px`,
      }"
    >
      {{ displayText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Extension } from '@speed-sheet/vue3-antd'

const props = defineProps<{
  extension: Extension
}>()

const options = computed(() => props.extension.options || {})
const storage = computed(() => props.extension.storage as { visible: boolean; text?: string })

const displayText = computed(() => {
  return storage.value?.text || options.value?.text || '机密文档 · SPEED SHEET'
})
</script>

<style scoped>
.sheet-watermark-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(4, 1fr);
  overflow: hidden;
}

.watermark-item {
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(-25deg);
  font-weight: 600;
  user-select: none;
  letter-spacing: 2px;
}
</style>

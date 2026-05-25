<template>
  <s-keymap-tip title="格式刷">
    <a-button
      class="shadow-btn-wrapper"
      type="text"
      :class="{ 'is-active': formatPainterActive }"
      :disabled="!editableCpt"
      @click="toggleFormatPainter"
    >
      <clear-outlined style="font-size: 16px" />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { ClearOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const {
  editableCpt,
  formatPainterActive,
  copiedStyle,
  activeCell,
  pickStyle,
} = useSheetToolbar()

function toggleFormatPainter() {
  if (formatPainterActive.value) {
    formatPainterActive.value = false
    copiedStyle.value = null
    return
  }
  if (!activeCell.value) return
  copiedStyle.value = pickStyle(activeCell.value)
  formatPainterActive.value = true
  message.info('格式刷已开启，点击目标单元格应用（Esc 取消待接入）')
}
</script>

<template>
  <s-keymap-tip title="粗体">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :class="{ 'is-active': isBoldActive }"
      :disabled="!editableCpt"
      @click="toggleBold"
    >
      <bold-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { BoldOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const isBoldActive = computed(() => activeCell.value?.bl === 1)

function toggleBold() {
  if (!sheet.value) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setBold({ r, c }).run()
  })
}
</script>

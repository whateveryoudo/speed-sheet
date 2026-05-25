<template>
  <s-keymap-tip title="斜体">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :class="{ 'is-active': isItalicActive }"
      :disabled="!editableCpt"
      @click="toggleItalic"
    >
      <italic-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ItalicOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const isItalicActive = computed(() => activeCell.value?.it === 1)

function toggleItalic() {
  if (!sheet.value) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setItalic({ r, c }).run()
  })
}
</script>

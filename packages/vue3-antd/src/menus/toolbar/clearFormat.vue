<template>
  <s-keymap-tip :title="!disableMenu ? '清除格式' : null">
    <a-button
      class="shadow-btn-wrapper"
      :disabled="disableMenu"
      type="text"
      @click="clear"
    >
      <s-icon-font type="icon-kl-remove-format" :size="16" />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { sheet, editableCpt, forEachSelectedCell } = useSheetToolbar()

const disableMenu = computed(() => !editableCpt.value)

function clear() {
  if (!sheet.value) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().clearCellFormat({ r, c }).run()
  })
}
</script>

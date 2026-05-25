<template>
  <s-keymap-tip title="下划线">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :class="{ 'is-active': isUnderlineActive }"
      :disabled="!editableCpt"
      @click="toggleUnderline"
    >
      <underline-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UnderlineOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const isUnderlineActive = computed(() => activeCell.value?.un === 1)

function toggleUnderline() {
  if (!sheet.value) return
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setUnderline({ r, c }).run()
  })
}
</script>

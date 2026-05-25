<template>
  <s-keymap-tip title="重做">
    <a-button
      :disabled="!editableCpt"
      type="text"
      class="shadow-btn-wrapper"
      @click="redo"
    >
      <redo-outlined class="text-[16px]" />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { RedoOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { sheet, editableCpt } = useSheetToolbar()

function redo() {
  sheet.value?.chain().redo().run()
}
</script>

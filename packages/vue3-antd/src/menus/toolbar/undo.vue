<template>
  <s-keymap-tip title="撤销">
    <a-button
      :disabled="!editableCpt"
      type="text"
      class="shadow-btn-wrapper"
      @click="undo"
    >
      <undo-outlined class="text-[16px]" />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { UndoOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { sheet, editableCpt } = useSheetToolbar()

function undo() {
  sheet.value?.chain().undo().run()
}
</script>

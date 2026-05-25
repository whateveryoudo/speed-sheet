<template>
  <s-keymap-tip title="查找替换">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :disabled="!editableCpt"
      @click="openFindReplace"
    >
      <file-search-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { FileSearchOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { editableCpt, findReplaceOpen } = useSheetToolbar()

function openFindReplace() {
  findReplaceOpen.value = true
  message.info('查找替换面板待实现（与编辑器版差异较大）')
}
</script>

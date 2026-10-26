<template>
  <s-keymap-tip :title="editableCpt ? '文件导出' : null">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :disabled="!editableCpt"
      @click="modalVisible = true"
    >
      <ExportOutlined />
    </a-button>
  </s-keymap-tip>

  <ExportModal v-model:visible="modalVisible" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ExportOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import ExportModal from './importExport/ExportModal.vue'

const { editableCpt } = useSheetToolbar()
const modalVisible = ref(false)
</script>

<template>
  <s-keymap-tip :title="editableCpt ? '文件导入' : null">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :disabled="!editableCpt"
      @click="modalVisible = true"
    >
      <ImportOutlined />
    </a-button>
  </s-keymap-tip>

  <ImportModal v-model:visible="modalVisible" />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ImportOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import ImportModal from './importExport/ImportModal.vue'

const { editableCpt } = useSheetToolbar()
const modalVisible = ref(false)
</script>

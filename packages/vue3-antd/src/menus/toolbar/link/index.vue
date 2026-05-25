<template>
  <a-tooltip title="插入链接">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :disabled="!editableCpt"
      @click="onLink"
    >
      <link-outlined />
    </a-button>
  </a-tooltip>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { LinkOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../../composables/useSheetToolbar'

const { editableCpt } = useSheetToolbar()

function onLink() {
  message.info('单元格链接待实现')
}
</script>

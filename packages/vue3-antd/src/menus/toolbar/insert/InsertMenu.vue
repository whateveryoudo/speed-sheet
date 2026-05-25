<template>
  <a-dropdown :trigger="['click']" :disabled="!editableCpt">
    <a-tooltip title="插入">
      <a-button type="text" class="shadow-btn-wrapper" :disabled="!editableCpt">
        <plus-circle-filled class="text-[16px] text-[var(--speed-toolbar-icon-color)]" />
      </a-button>
    </a-tooltip>
    <template #overlay>
      <a-menu @click="onMenuClick">
        <a-menu-item key="insertRowAbove">在上方插入行</a-menu-item>
        <a-menu-item key="insertRowBelow">在下方插入行</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="insertColLeft">在左侧插入列</a-menu-item>
        <a-menu-item key="insertColRight">在右侧插入列</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="insertImage" disabled>插入图片（待实现）</a-menu-item>
        <a-menu-item key="insertLink" disabled>插入链接（待实现）</a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { PlusCircleFilled } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../../composables/useSheetToolbar'

const { editableCpt } = useSheetToolbar()

function onMenuClick({ key }: { key: string }) {
  message.info(`「${key}」待接入表格命令`)
}
</script>

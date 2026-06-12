<template>
  <a-dropdown
    v-model:open="open"
    :trigger="['click']"
    :disabled="!editableCpt"
    overlay-class-name="sheet-protection-dropdown"
  >
    <s-keymap-tip :title="editableCpt ? t('protection.title') : null">
      <a-button type="text" class="shadow-btn-wrapper" :disabled="!editableCpt">
        <LockOutlined />
        <CaretDownOutlined class="protection-caret" />
      </a-button>
    </s-keymap-tip>
    <template #overlay>
      <a-menu @click="onMenuClick">
        <a-menu-item key="rows">{{ t('protection.protectRows') }}</a-menu-item>
        <a-menu-item key="cols">{{ t('protection.protectCols') }}</a-menu-item>
        <a-menu-item key="cells">{{ t('protection.protectCells') }}</a-menu-item>
        <a-menu-divider />
        <a-menu-item key="manage">{{ t('protection.manage') }}</a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CaretDownOutlined, LockOutlined } from '@ant-design/icons-vue'
import type { MenuProps } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useProtectionManageOptional } from '../../composables/useProtectionManage'

const { t } = useI18n()
const open = ref(false)
const { sheet, editableCpt } = useSheetToolbar()
const manage = useProtectionManageOptional()

const onMenuClick: MenuProps['onClick'] = ({ key }) => {
  open.value = false
  const s = sheet.value
  if (!s) return

  if (key === 'manage') {
    manage?.openModal()
    return
  }

  if (key === 'rows') s.chain().protectRows().run()
  else if (key === 'cols') s.chain().protectCols().run()
  else if (key === 'cells') s.chain().protectCells().run()
}
</script>

<style scoped lang="less">
.protection-caret {
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.65;
}
</style>

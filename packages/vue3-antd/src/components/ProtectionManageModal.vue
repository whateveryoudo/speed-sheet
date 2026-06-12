<template>
  <a-modal
    v-model:open="open"
    :title="t('protection.manageTitle')"
    :footer="null"
    width="480px"
    destroy-on-close
  >
    <div v-if="entries.length === 0" class="protection-manage__empty">
      {{ t('protection.manageEmpty') }}
    </div>
    <ul v-else class="protection-manage__list">
      <li v-for="entry in entries" :key="entry.id" class="protection-manage__item">
        <span class="protection-manage__label">{{ formatProtectionLabel(entry) }}</span>
        <a-button type="link" size="small" @click="unprotect(entry.id)">
          {{ t('protection.unprotect') }}
        </a-button>
      </li>
    </ul>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatProtectionLabel, getProtectionEntries } from '@speed-sheet/extension-protection'
import { useSheetToolbar } from '../composables/useSheetToolbar'
import { useProtectionManageOptional } from '../composables/useProtectionManage'

const { t } = useI18n()
const { sheet, revision } = useSheetToolbar()
const manage = useProtectionManageOptional()

const open = computed({
  get: () => manage?.open.value ?? false,
  set: (v: boolean) => {
    if (v) manage?.openModal()
    else manage?.closeModal()
  },
})

const entries = computed(() => {
  void revision.value
  const s = sheet.value
  return s ? getProtectionEntries(s) : []
})

function unprotect(id: string): void {
  sheet.value?.chain().unprotectEntry({ id }).run()
}
</script>

<style scoped lang="less">
.protection-manage__empty {
  color: var(--ant-color-text-secondary);
  padding: 8px 0;
}

.protection-manage__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.protection-manage__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--ant-color-border-secondary);

  &:last-child {
    border-bottom: none;
  }
}

.protection-manage__label {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}
</style>

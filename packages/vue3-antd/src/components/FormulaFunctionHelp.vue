<template>
  <div v-if="entry" class="formula-fn-help">
    <div class="formula-fn-help-head">
      <span class="formula-fn-help-syntax">{{ entry.syntax }}</span>
      <close-outlined class="formula-fn-help-close" @click="emit('close')" />
    </div>
    <p class="formula-fn-help-desc">{{ entry.hint }}</p>
    <p v-if="!entry.implemented" class="formula-fn-help-warn">
      {{ t('formula.notImplementedYet') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { CloseOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import type { FormulaBuiltinEntry } from '@speed-sheet/extension-formula'

defineProps<{
  entry: FormulaBuiltinEntry | null
}>()

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
</script>

<style scoped lang="less">
.formula-fn-help {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.45;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  max-width: 360px;
}

.formula-fn-help-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.formula-fn-help-syntax {
  font-family: ui-monospace, Menlo, monospace;
  font-weight: 500;
}

.formula-fn-help-close {
  cursor: pointer;
  color: var(--ant-color-text-tertiary);
  font-size: 10px;
}

.formula-fn-help-desc {
  margin: 0;
  color: var(--ant-color-text-secondary);
}

.formula-fn-help-warn {
  margin: 6px 0 0;
  color: var(--ant-color-warning);
  font-size: 11px;
}
</style>

<template>
  <a-modal
    v-model:open="open"
    :title="t('formula.allFunctions')"
    width="720px"
    :footer="null"
    destroy-on-close
  >
    <div class="formula-browser">
      <div class="formula-browser-toolbar">
        <a-select
          v-model:value="categoryFilter"
          class="w-120px"
          :options="categoryOptions"
        />
        <a-input
          v-model:value="search"
          allow-clear
          :placeholder="t('formula.searchPlaceholder')"
          class="flex-1"
        >
          <template #prefix>
            <search-outlined />
          </template>
        </a-input>
      </div>
      <div class="formula-browser-body">
        <div class="formula-browser-list">
          <div
            v-for="fn in filtered"
            :key="fn.name"
            class="formula-browser-item"
            :class="{ active: selected?.name === fn.name }"
            @click="selected = fn"
          >
            {{ fn.name }}
            <a-tag v-if="fn.implemented" color="blue" class="ml-1 scale-90">OK</a-tag>
          </div>
        </div>
        <div v-if="selected" class="formula-browser-detail">
          <h4 class="detail-title">{{ selected.name }}</h4>
          <p><strong>{{ t('formula.definition') }}</strong> {{ selected.hint }}</p>
          <p v-if="selected.syntax">
            <strong>{{ t('formula.syntax') }}</strong>
            <code>{{ selected.syntax }}</code>
          </p>
          <p v-if="selected.example">
            <strong>{{ t('formula.example') }}</strong>
            <code>{{ selected.example }}</code>
          </p>
          <p v-if="selected.description" class="detail-desc">{{ selected.description }}</p>
          <p v-if="selected.seeAlso?.length">
            <strong>{{ t('formula.seeAlso') }}</strong>
            {{ selected.seeAlso.join(', ') }}
          </p>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SearchOutlined } from '@ant-design/icons-vue'
import {
  FORMULA_BUILTIN_REGISTRY,
  FORMULA_CATEGORIES,
  searchBuiltins,
  categoryLabel,
  type FormulaBuiltinEntry,
  type FormulaCategoryId,
} from '@speed-sheet/extension-formula'
import { useSheetLocale } from '../../../composables/useSheetLocale'

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { locale } = useSheetLocale()
const sheetLocale = computed(() => (locale.value.startsWith('en') ? 'en' : 'zh'))

const search = ref('')
const categoryFilter = ref<string>('all')
const selected = ref<FormulaBuiltinEntry | null>(null)

const categoryOptions = computed(() => [
  { value: 'all', label: t('formula.categoryAll') },
  ...FORMULA_CATEGORIES.map((c) => ({
    value: c.id,
    label: categoryLabel(c.id, sheetLocale.value),
  })),
])

const filtered = computed(() => {
  let list = searchBuiltins(search.value)
  if (categoryFilter.value !== 'all') {
    list = list.filter((b) => b.category === categoryFilter.value)
  }
  return list
})

watch(open, (v) => {
  if (v) {
    search.value = ''
    categoryFilter.value = 'all'
    selected.value = FORMULA_BUILTIN_REGISTRY[0] ?? null
  }
})

watch(filtered, (list) => {
  if (!list.length) {
    selected.value = null
    return
  }
  if (!selected.value || !list.some((b) => b.name === selected.value?.name)) {
    selected.value = list[0]
  }
})
</script>

<style scoped lang="less">
.formula-browser-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.formula-browser-body {
  display: flex;
  height: 400px;
  border: 1px solid var(--ant-color-border);
  border-radius: var(--ant-border-radius);
  overflow: hidden;
}

.formula-browser-list {
  width: 200px;
  overflow-y: auto;
  border-right: 1px solid var(--ant-color-border);
}

.formula-browser-item {
  padding: 6px 12px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  cursor: pointer;

  &:hover,
  &.active {
    background: var(--ant-color-fill-quaternary);
  }
}

.formula-browser-detail {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
  font-size: var(--ant-font-size-sm);
  line-height: 1.6;

  code {
    font-family: ui-monospace, Menlo, monospace;
    background: var(--ant-color-fill-quaternary);
    padding: 0 4px;
    border-radius: 2px;
  }
}

.detail-title {
  margin: 0 0 8px;
  font-size: 16px;
}

.detail-desc {
  color: var(--ant-color-text-secondary);
}
</style>

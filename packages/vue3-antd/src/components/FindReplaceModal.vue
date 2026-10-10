<template>
  <div
    v-if="open && isEnabled"
    class="speed-sheet-find-replace-modal"
    :style="modalStyle"
    @keydown.stop
  >
    <div class="find-replace-card">
      <!-- Header Tabs -->
      <div class="find-replace-header">
        <div class="find-replace-tabs">
          <div
            class="find-replace-tab"
            :class="{ 'is-active': activeTab === 'find' }"
            @click="activeTab = 'find'"
          >
            {{ t('toolbar.find') || '查找' }}
          </div>
          <div
            v-if="editable"
            class="find-replace-tab"
            :class="{ 'is-active': activeTab === 'replace' }"
            @click="activeTab = 'replace'"
          >
            {{ t('toolbar.replace') || '替换' }}
          </div>
        </div>
        <div class="find-replace-close" @click="handleClose">
          <CloseOutlined />
        </div>
      </div>

      <!-- Tab Content: 查找 -->
      <div v-show="activeTab === 'find'" class="find-replace-body">
        <div class="find-replace-input-wrap">
          <a-input
            ref="findInputRef"
            v-model:value="query"
            :placeholder="t('toolbar.findPlaceholder') || '需要查找的字符'"
            allow-clear
            @press-enter="findNext"
            @change="handleQueryChange"
          >
            <template #suffix>
              <span class="find-replace-counter">
                {{ matches.length > 0 ? currentIndex + 1 : 0 }} / {{ matches.length }}
              </span>
            </template>
          </a-input>
        </div>
        <div class="find-replace-actions">
          <a-button
            size="small"
            :disabled="matches.length === 0"
            @click="findPrev"
          >
            {{ t('toolbar.findPrev') || '上一个' }}
          </a-button>
          <a-button
            size="small"
            type="primary"
            :disabled="matches.length === 0"
            @click="findNext"
          >
            {{ t('toolbar.findNext') || '下一个' }}
          </a-button>
        </div>
      </div>

      <!-- Tab Content: 替换 -->
      <div v-show="activeTab === 'replace'" class="find-replace-body">
        <div class="find-replace-field">
          <div class="find-replace-label">{{ t('toolbar.findLabel') || '查找' }}</div>
          <a-input
            v-model:value="query"
            :placeholder="t('toolbar.findPlaceholder') || '需要查找的字符'"
            allow-clear
            @press-enter="findNext"
            @change="handleQueryChange"
          >
            <template #suffix>
              <span class="find-replace-counter">
                {{ matches.length > 0 ? currentIndex + 1 : 0 }} / {{ matches.length }}
              </span>
            </template>
          </a-input>
        </div>
        <div class="find-replace-field">
          <div class="find-replace-label">{{ t('toolbar.replaceLabel') || '替换为' }}</div>
          <a-input
            v-model:value="replaceWith"
            :placeholder="t('toolbar.replacePlaceholder') || '要替换的字符'"
            allow-clear
            @press-enter="handleReplace"
          />
        </div>
        <div class="find-replace-actions find-replace-actions--between">
          <a-button
            size="small"
            :disabled="matches.length === 0"
            @click="handleReplaceAll"
          >
            {{ t('toolbar.replaceAll') || '替换全部' }}
          </a-button>
          <div class="find-replace-actions-right">
            <a-button
              size="small"
              :disabled="matches.length === 0"
              @click="handleReplace"
            >
              {{ t('toolbar.replace') || '替换' }}
            </a-button>
            <a-button
              size="small"
              :disabled="matches.length === 0"
              @click="findPrev"
            >
              {{ t('toolbar.findPrev') || '上一个' }}
            </a-button>
            <a-button
              size="small"
              type="primary"
              :disabled="matches.length === 0"
              @click="findNext"
            >
              {{ t('toolbar.findNext') || '下一个' }}
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import type { Sheet } from '@speed-sheet/core'
import {
  findMatchesInSheet,
  getNextMatchIndex,
  replaceCellMatch,
  replaceAllMatches,
  type FindMatch,
} from '@speed-sheet/core'

const props = defineProps<{
  open: boolean
  sheet: Sheet | null | undefined
  revision: number
  editable: boolean
  searchReplaceConfig?: {
    enabled?: boolean
    shortcut?: boolean
    style?: Record<string, string | number>
  }
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'update:findMatches', matches: Array<{ r: number; c: number }> | null): void
  (e: 'navigate', r: number, c: number): void
}>()

const { t } = useI18n()

const activeTab = ref<'find' | 'replace'>('find')
const query = ref('')
const replaceWith = ref('')
const findInputRef = ref()
const matches = ref<FindMatch[]>([])
const currentIndex = ref(0)

const isEnabled = computed(() => props.searchReplaceConfig?.enabled !== false)
const modalStyle = computed(() => props.searchReplaceConfig?.style || {})

watch(
  () => props.open,
  (val) => {
    if (val) {
      nextTick(() => {
        findInputRef.value?.focus?.()
      })
      doSearch()
    } else {
      clearMatches()
    }
  },
)

watch(
  () => [props.revision, props.sheet],
  () => {
    if (props.open && query.value) {
      doSearch()
    }
  },
)

function clearMatches(): void {
  matches.value = []
  currentIndex.value = 0
  emit('update:findMatches', null)
}

function doSearch(): void {
  if (!props.sheet || !query.value.trim()) {
    clearMatches()
    return
  }
  const result = findMatchesInSheet(props.sheet.state, query.value, {
    caseSensitive: false,
  })
  matches.value = result
  emit(
    'update:findMatches',
    result.map((m) => ({ r: m.r, c: m.c })),
  )

  if (result.length > 0) {
    // 聚焦匹配项
    const sel = props.sheet.state.getSelection()
    const ar = sel?.anchor?.r ?? sel?.row[0] ?? -1
    const ac = sel?.anchor?.c ?? sel?.column[0] ?? -1
    const exactIdx = result.findIndex((m) => m.r === ar && m.c === ac)
    if (exactIdx !== -1) {
      currentIndex.value = exactIdx
    } else {
      const nextIdx = getNextMatchIndex(result, ar, ac, 'next')
      currentIndex.value = nextIdx !== -1 ? nextIdx : 0
      jumpToMatch(currentIndex.value)
    }
  }
}

function handleQueryChange(): void {
  doSearch()
}

function jumpToMatch(index: number): void {
  if (index < 0 || index >= matches.value.length || !props.sheet) return
  currentIndex.value = index
  const m = matches.value[index]
  // 选区选中该单元格
  props.sheet.chain().selectRange({
    row: [m.r, m.r],
    column: [m.c, m.c],
    anchor: { r: m.r, c: m.c },
  }).run()
  emit('navigate', m.r, m.c)
}

function findNext(): void {
  if (!matches.value.length || !props.sheet) return
  const sel = props.sheet.state.getSelection()
  const ar = sel?.anchor?.r ?? sel?.row[0] ?? -1
  const ac = sel?.anchor?.c ?? sel?.column[0] ?? -1
  const nextIdx = getNextMatchIndex(matches.value, ar, ac, 'next')
  jumpToMatch(nextIdx)
}

function findPrev(): void {
  if (!matches.value.length || !props.sheet) return
  const sel = props.sheet.state.getSelection()
  const ar = sel?.anchor?.r ?? sel?.row[0] ?? -1
  const ac = sel?.anchor?.c ?? sel?.column[0] ?? -1
  const prevIdx = getNextMatchIndex(matches.value, ar, ac, 'prev')
  jumpToMatch(prevIdx)
}

function handleReplace(): void {
  if (!props.sheet || !matches.value.length) return
  const m = matches.value[currentIndex.value]
  if (!m) return
  const ok = replaceCellMatch(props.sheet, m.r, m.c, query.value, replaceWith.value, {
    caseSensitive: false,
  })
  if (ok) {
    message.success(t('toolbar.replaceSuccess') || '替换成功')
    doSearch()
  }
}

function handleReplaceAll(): void {
  if (!props.sheet || !matches.value.length) return
  const count = replaceAllMatches(props.sheet, query.value, replaceWith.value, {
    caseSensitive: false,
  })
  if (count > 0) {
    message.success((t('toolbar.replaceAllSuccess') || '已替换全部 {count} 处匹配').replace('{count}', String(count)))
    doSearch()
  }
}

function handleClose(): void {
  emit('update:open', false)
  clearMatches()
}

defineExpose({
  openTab: (tab: 'find' | 'replace') => {
    activeTab.value = tab
  },
})
</script>

<style scoped lang="less">
.speed-sheet-find-replace-modal {
  position: absolute;
  top: 48px;
  right: 24px;
  z-index: 1000;
  width: 320px;
  pointer-events: auto;
}

.find-replace-card {
  background: var(--ant-color-bg-elevated, #ffffff);
  border-radius: 8px;
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12);
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  overflow: hidden;
  padding: 12px 16px 16px;
}

.find-replace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  padding-bottom: 8px;
  margin-bottom: 12px;
}

.find-replace-tabs {
  display: flex;
  gap: 24px;
}

.find-replace-tab {
  font-size: 14px;
  font-weight: 500;
  color: var(--ant-color-text-secondary, #8c8c8c);
  cursor: pointer;
  position: relative;
  padding-bottom: 4px;
  user-select: none;
  transition: color 0.2s;

  &:hover {
    color: var(--ant-color-text, #262626);
  }

  &.is-active {
    color: var(--ant-color-text, #262626);
    font-weight: 600;

    &::after {
      content: '';
      position: absolute;
      bottom: -9px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--ant-color-primary, #00b96b);
      border-radius: 1px;
    }
  }
}

.find-replace-close {
  cursor: pointer;
  color: var(--ant-color-text-tertiary, #bfbfbf);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    color: var(--ant-color-text, #262626);
    background: var(--ant-color-fill-tertiary, rgba(0, 0, 0, 0.04));
  }
}

.find-replace-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.find-replace-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.find-replace-label {
  font-size: 12px;
  color: var(--ant-color-text-secondary, #8c8c8c);
}

.find-replace-counter {
  font-size: 12px;
  color: var(--ant-color-text-secondary, #8c8c8c);
}

.find-replace-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;

  &--between {
    justify-content: space-between;
  }
}

.find-replace-actions-right {
  display: flex;
  gap: 8px;
}
</style>

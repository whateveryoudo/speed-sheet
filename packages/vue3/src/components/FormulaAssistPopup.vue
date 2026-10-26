<template>
  <div
    v-if="visible"
    ref="popupEl"
    class="formula-assist-popup"
    :class="{ 'is-collapsed': isCollapsed, 'is-floating': !!anchorEl }"
    :style="floatingStyle"
    @mousedown.prevent.stop
  >
    <!-- 1. 搜索候选下拉框 (Search Mode) -->
    <template v-if="context.type === 'search'">
      <div class="formula-search-container">
        <div class="formula-search-list" role="listbox">
          <div
            v-for="(item, idx) in context.candidates"
            :key="item.name"
            class="formula-search-item"
            :class="{ 'is-active': idx === activeIndex }"
            @mouseenter="activeIndex = idx"
            @click.stop="onSelect(item)"
          >
            <span class="formula-search-item__name">{{ item.name }}</span>
            <span v-if="item.label" class="formula-search-item__label">{{ item.label }}</span>
          </div>
        </div>

        <!-- 底部详情预览区，最多显示两行描述，超出两行溢出省略 -->
        <div v-if="activeCandidate" class="formula-search-preview">
          <div v-if="activeCandidate.syntax" class="formula-search-preview__syntax">
            {{ activeCandidate.syntax }}
          </div>
          <div v-if="activeCandidate.hint" class="formula-search-preview__hint">
            {{ activeCandidate.hint }}
          </div>
        </div>
      </div>
    </template>

    <!-- 2. 函数参数与语法提示卡片 (Help Mode) -->
    <template v-else-if="context.type === 'help'">
      <div class="formula-help-card">
        <!-- 顶部操作栏与函数签名 -->
        <div class="formula-help-header">
          <div class="formula-help-signature">
            <span class="formula-help-fn-name">{{ context.functionName }}</span>
            <span class="formula-help-paren">(</span>
            <span class="formula-help-params">
              <template v-for="(p, idx) in context.params" :key="idx">
                <span
                  class="formula-help-param-token"
                  :class="{ 'is-active': idx === context.activeParamIndex }"
                >{{ p }}</span>
                <span v-if="idx < context.params.length - 1" class="formula-help-comma">, </span>
              </template>
            </span>
            <span class="formula-help-paren">)</span>
          </div>

          <div class="formula-help-actions">
            <button
              type="button"
              class="formula-help-btn"
              :title="isCollapsed ? '展开参数帮助' : '折叠参数帮助'"
              @click="isCollapsed = !isCollapsed"
            >
              <svg v-if="isCollapsed" viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
                <path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z" />
              </svg>
              <svg v-else viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
                <path d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z" />
              </svg>
            </button>
            <button
              type="button"
              class="formula-help-btn"
              title="关闭"
              @click="emit('close')"
            >
              <svg viewBox="0 0 1024 1024" width="12" height="12" fill="currentColor">
                <path d="M799.86 166.31L512 454.17 224.14 166.31a32 32 0 0 0-45.25 45.25L466.75 499.42 178.89 787.28a32 32 0 0 0 45.25 45.25L512 544.67l287.86 287.86a32 32 0 0 0 45.25-45.25L557.25 499.42l287.86-287.86a32 32 0 0 0-45.25-45.25z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 详细说明与示例（折叠时隐藏） -->
        <div v-show="!isCollapsed" class="formula-help-body">
          <div v-if="context.entry.hint" class="formula-help-summary">
            {{ context.entry.hint }}
          </div>

          <div v-if="context.entry.example" class="formula-help-section">
            <span class="formula-help-section-title">示例：</span>
            <code class="formula-help-code">{{ context.entry.example }}</code>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import type { FormulaBuiltinEntry, FormulaPromptContext } from '@speed-sheet/extension-formula'

const props = withDefaults(
  defineProps<{
    context: FormulaPromptContext
    anchorEl?: HTMLElement | null
    boundary?: HTMLElement | null
  }>(),
  {
    anchorEl: null,
    boundary: null,
  },
)

const emit = defineEmits<{
  select: [entry: FormulaBuiltinEntry]
  close: []
}>()

const popupEl = ref<HTMLElement | null>(null)
const isCollapsed = ref(false)
const activeIndex = ref(0)
const floatingStyle = ref<Record<string, string>>({})
let cleanupAutoUpdate: (() => void) | null = null

const visible = computed(() => props.context.type !== 'none')

const activeCandidate = computed(() => {
  if (props.context.type !== 'search') return null
  const list = props.context.candidates
  if (!list || list.length === 0) return null
  return list[activeIndex.value] ?? list[0]
})

async function updateFloatingPosition(): Promise<void> {
  const el = popupEl.value
  const anchor = props.anchorEl
  if (!el || !anchor) {
    floatingStyle.value = {}
    return
  }

  const boundary = props.boundary ?? undefined
  const { x, y } = await computePosition(anchor, el, {
    placement: 'bottom-start',
    strategy: 'absolute',
    middleware: [
      offset(4),
      flip({ boundary }),
      shift({ boundary, padding: 8 }),
    ],
  })

  floatingStyle.value = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
  }
}

function setupFloating(): void {
  cleanupFloating()
  const anchor = props.anchorEl
  const el = popupEl.value
  if (!anchor || !el) return

  cleanupAutoUpdate = autoUpdate(anchor, el, () => {
    updateFloatingPosition()
  })
}

function cleanupFloating(): void {
  cleanupAutoUpdate?.()
  cleanupAutoUpdate = null
}

watch(
  () => [visible.value, props.anchorEl] as const,
  async ([show, anchor]) => {
    if (!show || !anchor) {
      cleanupFloating()
      floatingStyle.value = {}
      return
    }
    await nextTick()
    setupFloating()
    await updateFloatingPosition()
  },
)

watch(
  () => isCollapsed.value,
  async () => {
    await nextTick()
    await updateFloatingPosition()
  },
)

onUnmounted(() => {
  cleanupFloating()
})

watch(
  () => props.context,
  (next) => {
    if (next.type === 'search') {
      activeIndex.value = 0
    }
  },
  { deep: true },
)

function onSelect(entry: FormulaBuiltinEntry): void {
  emit('select', entry)
}

/** 供外部键盘事件联动调用 */
function selectCurrent(): boolean {
  if (props.context.type === 'search') {
    const list = props.context.candidates
    if (list && list.length > 0) {
      const idx = Math.max(0, Math.min(activeIndex.value, list.length - 1))
      onSelect(list[idx])
      return true
    }
  }
  return false
}

function moveNext(): boolean {
  if (props.context.type === 'search') {
    const total = props.context.candidates.length
    if (total > 0) {
      activeIndex.value = (activeIndex.value + 1) % total
      return true
    }
  }
  return false
}

function movePrev(): boolean {
  if (props.context.type === 'search') {
    const total = props.context.candidates.length
    if (total > 0) {
      activeIndex.value = (activeIndex.value - 1 + total) % total
      return true
    }
  }
  return false
}

defineExpose({
  selectCurrent,
  moveNext,
  movePrev,
})
</script>

<style scoped>
.formula-assist-popup {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1050;
  min-width: 280px;
  max-width: 440px;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', sans-serif;
  font-size: 12px;
  color: #333333;
  line-height: 1.5;
  user-select: none;
  overflow: hidden;
  animation: formulaFadeIn 0.12s cubic-bezier(0, 0, 0.2, 1);
}

.formula-assist-popup.is-floating {
  top: auto;
  left: auto;
}

@keyframes formulaFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 搜索候选列表容器 */
.formula-search-container {
  display: flex;
  flex-direction: column;
}

.formula-search-list {
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 0;
}

.formula-search-item {
  height: 30px;
  line-height: 30px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  box-sizing: border-box;
  transition: background-color 0.1s ease;
}

.formula-search-item:hover,
.formula-search-item.is-active {
  background-color: #f0f7ff;
}

.formula-search-item__name {
  font-weight: 600;
  font-size: 13px;
  color: #1677ff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.formula-search-item__label {
  color: #8c8c8c;
  font-size: 12px;
  margin-left: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}

/* 底部详情说明区：高度稳定，两行溢出省略 */
.formula-search-preview {
  padding: 8px 12px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.formula-search-preview__syntax {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.formula-search-preview__hint {
  font-size: 12px;
  line-height: 1.5;
  color: #595959;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

/* 函数参数帮助卡片 */
.formula-help-card {
  padding: 8px 12px;
}

.formula-help-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.formula-help-signature {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-all;
}

.formula-help-fn-name {
  font-weight: bold;
  color: #0958d9;
}

.formula-help-paren {
  color: #8c8c8c;
}

.formula-help-param-token {
  padding: 1px 4px;
  border-radius: 3px;
  transition: all 0.1s ease;
}

.formula-help-param-token.is-active {
  background: #fff9b2;
  color: #d46b08;
  font-weight: bold;
  box-shadow: 0 0 0 1px #ffe58f;
}

.formula-help-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.formula-help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  color: #8c8c8c;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.formula-help-btn:hover {
  color: #262626;
  background: #f5f5f5;
}

.formula-help-body {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.formula-help-summary {
  color: #434343;
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.formula-help-section {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
}

.formula-help-section-title {
  color: #8c8c8c;
}

.formula-help-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  background: #f5f5f5;
  padding: 1px 5px;
  border-radius: 3px;
  color: #1f1f1f;
}
</style>

<template>
  <div class="sheet-filter-panel" @mousedown.stop>
    <div class="sheet-filter-panel__head">
      <span class="sheet-filter-panel__title">
        筛选
        <template v-if="activeColumnLabel">（{{ activeColumnLabel }}列）</template>
      </span>
      <span v-if="draft" class="sheet-filter-panel__range">筛选区({{ draft.rangeLabel }})</span>
    </div>

    <a-radio-group v-model:value="sortValue" size="small" class="sheet-filter-panel__sort mb-2" :disabled="!draft"
      button-style="solid">
      <a-radio-button value="asc">升序</a-radio-button>
      <a-radio-button value="desc">降序</a-radio-button>
    </a-radio-group>

    <a-tabs v-model:activeKey="tab" size="small" class="sheet-filter-panel__tabs">
      <a-tab-pane key="content" tab="按内容">
        <div class="sheet-filter-panel__toolbar">
          <a-checkbox :indeterminate="indeterminate" :checked="allChecked" @change="toggleAll">
            全选
          </a-checkbox>
          <span class="sheet-filter-panel__count">{{ selectedCount }}/{{ stats.length }}</span>
        </div>
        <div class="sheet-filter-panel__list">
          <label v-for="item in stats" :key="item.value" class="sheet-filter-panel__item">
            <a-checkbox :checked="isValueSelected(item.value)"
              @change="(e: Event) => toggleValue(item.value, (e.target as HTMLInputElement).checked)" />
            <span class="sheet-filter-panel__label">{{ item.label }}</span>
            <span class="sheet-filter-panel__item-count">({{ item.count }})</span>
          </label>
        </div>
      </a-tab-pane>
      <a-tab-pane key="color" tab="按颜色">
        <a-select v-model:value="colorDimension" class="sheet-filter-panel__color-dim w-full mb-2"
          :disabled="!draft || !colorDimSelectEnabled" :options="colorDimensionOptions" />
        <div v-if="colorOnlyOne" class="sheet-filter-panel__color-hint">
          筛选区域仅包含一种颜色
        </div>
        <template v-else>
          <div class="sheet-filter-panel__color-grid">
            <button v-for="item in colorStats" :key="item.value" type="button"
              :class="['sheet-filter-panel__color-swatch-btn', { 'is-selected': colorSelectedKey === item.value }]"
              :title="item.label" @click="selectColor(item.value)">
              <span :class="['sheet-filter-panel__color-swatch', { 'is-none': item.value === FILTER_COLOR_NONE }]"
                :style="item.value !== FILTER_COLOR_NONE ? { background: item.color } : undefined" />
            </button>
          </div>
        </template>
      </a-tab-pane>
      <a-tab-pane key="condition" tab="按条件">
        <FilterConditionPanel :condition-rule="currentRule?.condition" />
      </a-tab-pane>
    </a-tabs>

    <div class="sheet-filter-panel__visible-all">
      <span class="sheet-filter-panel__visible-all-label">筛选对所有人可见</span>
      <a-tooltip title="关闭：仅当前登录用户可见（写入 Y.Doc 按 userId 分桶）；开启：全员共享 sheetFilter">
        <question-circle-outlined class="sheet-filter-panel__visible-all-help" />
      </a-tooltip>
      <a-switch
        :checked="visibleToAll"
        :disabled="!draft"
        class="sheet-filter-panel__visible-all-switch"
        @update:checked="(v: boolean) => (visibleToAll = v)"
      />
    </div>

    <div class="sheet-filter-panel__foot">
      <a-button type="link" danger class="px-0!" @click="onClear">清除筛选</a-button>
      <a-space class="ml-auto">
        <a-button @click="onCancel">取消</a-button>
        <a-button type="primary" :disabled="!draft" @click="onConfirm">确定</a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { QuestionCircleOutlined } from '@ant-design/icons-vue'
import { useFilterConfigPanelOptional } from '../../composables/useFilterConfigPanel'
import type { Sheet } from '@speed-sheet/core'
import {
  applyFilterSession,
  clearFilter,
  collectColumnColorStats,
  collectColumnValueStats,
  defaultSelectedColor,
  detectColumnColorAvailability,
  dismissPendingFilter,
  FILTER_COLOR_NONE,
  buildInitialConditionRule,
  getFilterSession,
  type FilterColorDimension,
  type FilterColorRule,
  type FilterColumnRule,
  type FilterSession,
  type FilterSortOrder,
  type FilterTab,
} from '@speed-sheet/extension-filter'
import { colToLetter } from '@speed-sheet/core'
import FilterConditionPanel from './FilterConditionPanel.vue'

const props = defineProps<{
  sheet: Sheet | null
}>()

const emit = defineEmits<{
  cancel: []
  done: []
}>()

const visibleToAll = computed({
  get: () => draft.value?.visibleToAll ?? false,
  set: (v: boolean) => {
    if (draft.value) draft.value.visibleToAll = v
  },
})

const tab = ref<FilterTab>('content')
const activeColumn = ref(0)
const draft = ref<FilterSession | null>(null)
const filterPanel = useFilterConfigPanelOptional()

const activeColumnLabel = computed(() => colToLetter(activeColumn.value))

const currentRule = computed(() =>
  draft.value?.columnRules.find((r) => r.column === activeColumn.value),
)

const stats = computed(() => {
  const s = props.sheet
  const d = draft.value
  if (!s || !d) return []
  return collectColumnValueStats(
    s.state,
    activeColumn.value,
    d.dataStartRow,
    d.dataEndRow,
    d.headerRow,
  )
})

const selectedValues = computed(() => currentRule.value?.content?.selectedValues ?? [])

const selectedCount = computed(() => selectedValues.value.length)

const sortValue = computed<FilterSortOrder | undefined>({
  get: () => currentRule.value?.sort ?? undefined,
  set: (v) => {
    const rule = currentRule.value
    if (!rule) return
    rule.sort = v ?? null
  },
})

const allChecked = computed(
  () => stats.value.length > 0 && selectedCount.value === stats.value.length,
)

const indeterminate = computed(
  () => selectedCount.value > 0 && selectedCount.value < stats.value.length,
)

const colorScope = computed(() => {
  const d = draft.value
  if (!d) return null
  return {
    dataStartRow: d.dataStartRow,
    dataEndRow: d.dataEndRow,
    headerRow: d.headerRow,
  }
})

const colorAvailability = computed(() => {
  const s = props.sheet
  const scope = colorScope.value
  if (!s || !scope) {
    return { bgEnabled: false, fcEnabled: false, defaultDimension: 'bg' as FilterColorDimension }
  }
  return detectColumnColorAvailability(
    s.state,
    activeColumn.value,
    scope.dataStartRow,
    scope.dataEndRow,
    scope.headerRow,
  )
})

const colorDimensionOptions = computed(() => {
  const avail = colorAvailability.value
  return [
    {
      value: 'bg' as FilterColorDimension,
      label: '按单元格背景色筛选',
      disabled: !avail.bgEnabled,
    },
    {
      value: 'fc' as FilterColorDimension,
      label: '按文字颜色筛选',
      disabled: !avail.fcEnabled,
    },
  ]
})

const colorDimSelectEnabled = computed(
  () => colorAvailability.value.bgEnabled || colorAvailability.value.fcEnabled,
)

const colorDimension = computed<FilterColorDimension>({
  get: () => currentRule.value?.color?.dimension ?? colorAvailability.value.defaultDimension,
  set: (dim) => {
    const rule = currentRule.value
    if (!rule?.color) return
    rule.color.dimension = dim
  },
})

const colorStats = computed(() => {
  const s = props.sheet
  const d = draft.value
  if (!s || !d) return []
  return collectColumnColorStats(
    s.state,
    activeColumn.value,
    colorDimension.value,
    d.dataStartRow,
    d.dataEndRow,
    d.headerRow,
  )
})

const colorSelectedKey = computed(() => {
  const color = currentRule.value?.color
  if (!color) return undefined
  const list = colorDimension.value === 'bg' ? color.selectedBg : color.selectedFc
  return list[0]
})

const colorOnlyOne = computed(() => colorStats.value.length <= 1)

function selectColor(value: string): void {
  const rule = currentRule.value
  if (!rule?.color) return
  if (colorDimension.value === 'bg') rule.color.selectedBg = [value]
  else rule.color.selectedFc = [value]
}

function ensureColumnRuleShape(rule: FilterColumnRule): void {
  if (!rule.filterMode) rule.filterMode = 'content'
  if (!rule.color) {
    rule.color = {
      mode: 'color',
      dimension: 'bg',
      selectedBg: [],
      selectedFc: [],
    }
  }
  if (!rule.content) {
    rule.content = { mode: 'content', selectedValues: [] }
  }
  if (!rule.condition) {
    rule.condition = buildInitialConditionRule()
  }
}

function initColorRuleForColumn(rule: FilterColumnRule): void {
  const s = props.sheet
  const d = draft.value
  if (!s || !d) return
  const avail = detectColumnColorAvailability(
    s.state,
    rule.column,
    d.dataStartRow,
    d.dataEndRow,
    d.headerRow,
  )
  const bgStats = collectColumnColorStats(
    s.state,
    rule.column,
    'bg',
    d.dataStartRow,
    d.dataEndRow,
    d.headerRow,
  )
  const fcStats = collectColumnColorStats(
    s.state,
    rule.column,
    'fc',
    d.dataStartRow,
    d.dataEndRow,
    d.headerRow,
  )
  rule.color = {
    mode: 'color',
    dimension: avail.defaultDimension,
    selectedBg: [defaultSelectedColor(bgStats)],
    selectedFc: [defaultSelectedColor(fcStats)],
  }
}

function syncColorDimensionFromAvailability(): void {
  const rule = currentRule.value
  const avail = colorAvailability.value
  if (!rule?.color) return
  const dim = rule.color.dimension
  if (dim === 'bg' && !avail.bgEnabled && avail.fcEnabled) {
    rule.color.dimension = 'fc'
  } else if (dim === 'fc' && !avail.fcEnabled && avail.bgEnabled) {
    rule.color.dimension = 'bg'
  } else if (!avail.bgEnabled && !avail.fcEnabled) {
    rule.color.dimension = avail.defaultDimension
  }
}

function ensureColorSelectionForDimension(): void {
  const rule = currentRule.value
  if (!rule?.color || colorStats.value.length === 0) return
  const list = colorDimension.value === 'bg' ? rule.color.selectedBg : rule.color.selectedFc
  const key = list[0]
  if (list.length > 1) {
    selectColor(key ?? colorStats.value[0].value)
    return
  }
  if (!key || !colorStats.value.some((s) => s.value === key)) {
    selectColor(colorStats.value[0].value)
  }
}

function cloneSession(session: FilterSession): FilterSession {
  return JSON.parse(JSON.stringify(session)) as FilterSession
}

function loadDraft(): void {
  const s = props.sheet
  if (!s) {
    draft.value = null
    return
  }
  const session = getFilterSession(s)
  if (!session) {
    draft.value = null
    return
  }
  draft.value = cloneSession(session)
  for (const rule of draft.value.columnRules) {
    ensureColumnRuleShape(rule)
    if (
      !rule.color ||
      (rule.color.selectedBg.length === 0 && rule.color.selectedFc.length === 0)
    ) {
      initColorRuleForColumn(rule)
    }
  }
  syncActiveColumnFromAnchor()
  syncColorDimensionFromAvailability()
  ensureColorSelectionForDimension()
  const rule = draft.value.columnRules.find((r) => r.column === activeColumn.value)
  if (
    rule?.filterMode === 'color' ||
    rule?.filterMode === 'content' ||
    rule?.filterMode === 'condition'
  ) {
    tab.value = rule.filterMode
  }
}

/** 当前编辑列 = 面板锚点所在列（点击哪列表头筛选图标） */
function syncActiveColumnFromAnchor(): void {
  const panel = filterPanel
  const d = draft.value
  if (!panel || !d) return
  const c = panel.anchor.c
  if (d.columns.includes(c)) activeColumn.value = c
  else activeColumn.value = d.columns[0] ?? c
}

watch(() => props.sheet, loadDraft, { immediate: true })

watch(
  () => filterPanel?.open.value,
  (open) => {
    if (open) {
      loadDraft()
      syncActiveColumnFromAnchor()
    }
  },
)

watch(
  () => filterPanel?.anchor.c,
  () => {
    if (filterPanel?.open.value && draft.value) {
      syncActiveColumnFromAnchor()
      syncColorDimensionFromAvailability()
      ensureColorSelectionForDimension()
    }
  },
)

watch(colorDimension, () => {
  ensureColorSelectionForDimension()
})

watch([tab, activeColumn], () => {
  if (tab.value !== 'color' || !draft.value) return
  const rule = currentRule.value
  if (!rule) return
  ensureColumnRuleShape(rule)
  if (rule.color && rule.color.selectedBg.length === 0 && rule.color.selectedFc.length === 0) {
    initColorRuleForColumn(rule)
  }
  syncColorDimensionFromAvailability()
  ensureColorSelectionForDimension()
})

function isValueSelected(value: string): boolean {
  return selectedValues.value.includes(value)
}

function toggleValue(value: string, checked: boolean): void {
  const rule = currentRule.value
  if (!rule?.content) return
  const set = new Set(rule.content.selectedValues)
  if (checked) set.add(value)
  else set.delete(value)
  rule.content.selectedValues = [...set]
}

function toggleAll(e: Event): void {
  const rule = currentRule.value
  if (!rule?.content) return
  const checked = (e.target as HTMLInputElement).checked
  rule.content.selectedValues = checked ? stats.value.map((s) => s.value) : []
}

function onCancel(): void {
  if (props.sheet) dismissPendingFilter(props.sheet)
  emit('cancel')
}

function onConfirm(): void {
  const s = props.sheet
  const d = draft.value
  if (!s || !d) return
  const rule = d.columnRules.find((r) => r.column === activeColumn.value)
  if (rule) {
    if (tab.value === 'color') rule.filterMode = 'color'
    else if (tab.value === 'condition') rule.filterMode = 'condition'
    else rule.filterMode = 'content'
  }
  applyFilterSession(s, { ...d, active: true })
  emit('done')
}

function onClear(): void {
  if (props.sheet) clearFilter(props.sheet)
  emit('done')
}
</script>

<style scoped lang="less">
.sheet-filter-panel {
  width: 320px;
  padding: var(--ant-padding-sm);
}

.sheet-filter-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.sheet-filter-panel__title {
  font-weight: 600;
}

.sheet-filter-panel__range {
  color: #888;
}

.sheet-filter-panel__sort {
  display: flex;
  width: 100%;

  :deep(.ant-radio-button-wrapper) {
    flex: 1;
    text-align: center;
  }
}

.sheet-filter-panel__tabs {
  :deep(.ant-tabs-nav) {
    margin-bottom: 8px;
  }
}

.sheet-filter-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.sheet-filter-panel__count {
  color: #888;
  font-size: 12px;
}

.sheet-filter-panel__list {
  max-height: 300px;
  min-height: 220px;
  overflow-y: auto;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 4px 0;
}

.sheet-filter-panel__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  cursor: pointer;

  &:hover {
    background: #fafafa;
  }
}

.sheet-filter-panel__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-filter-panel__item-count {
  color: #999;
  font-size: 12px;
}

.sheet-filter-panel__visible-all {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.sheet-filter-panel__visible-all-label {
  flex: 1;
  color: rgba(0, 0, 0, 0.88);
  font-size: 13px;
}

.sheet-filter-panel__visible-all-help {
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
  cursor: help;
}

.sheet-filter-panel__visible-all-switch {
  flex-shrink: 0;
}

.sheet-filter-panel__foot {
  display: flex;
  align-items: center;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.sheet-filter-panel__color-hint {
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 250px;
}

.sheet-filter-panel__color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  min-height: 200px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px 0;
  align-content: start; 
}

.sheet-filter-panel__color-swatch-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 2px;

  &.is-selected {
    border-color: #52c41a;
  }

  .sheet-filter-panel__color-swatch {
    display: block;
    width: 100%;
    padding: 2px;
    border: 2px solid transparent;
    border-radius: 4px;
    background: #fff;
    height: 24px;
    box-sizing: border-box;

    &.is-none {
      background: #fff;
      position: relative;
      border: 1px solid #d9d9d9;

      &::after {
        position: absolute;
        top: 10px;
        left: -1px;
        display: block;
        width: 103%;
        height: 0;
        content: '';
        transform: rotate(18deg);
        border-bottom: 2px solid #ff5151;
      }
    }

  }
}
</style>

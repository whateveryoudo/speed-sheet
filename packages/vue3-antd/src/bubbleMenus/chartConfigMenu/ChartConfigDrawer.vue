<template>
  <a-drawer
    :open="visible"
    title="图表设置"
    placement="right"
    :width="340"
    :mask="false"
    :body-style="{ padding: 0 }"
    class="sheet-chart-drawer"
    @close="closeDrawer"
  >
    <div v-if="chart" class="chart-drawer-body">
      <a-tabs v-model:activeKey="activeTab" class="chart-tabs" centered>
        <!-- Tab 1: 全局设置 -->
        <a-tab-pane key="general" tab="全局设置">
          <!-- 图表类型 -->
          <div class="drawer-section">
            <div class="section-title">图表类型</div>
            <a-select
              :value="chart.config.chartType"
              style="width: 100%"
              @change="(val) => updateType(val as SheetChartType)"
            >
              <a-select-opt-group label="柱状图 / 条形图">
                <a-select-option value="bar">柱状图（簇状）</a-select-option>
                <a-select-option value="bar-stacked">堆叠柱状图</a-select-option>
                <a-select-option value="bar-horizontal">条形图（横向）</a-select-option>
              </a-select-opt-group>
              <a-select-opt-group label="折线图 / 面积图">
                <a-select-option value="line">折线图</a-select-option>
                <a-select-option value="line-smooth">平滑折线图</a-select-option>
                <a-select-option value="area-stacked">堆叠面积图</a-select-option>
              </a-select-opt-group>
              <a-select-opt-group label="饼图 / 环形图">
                <a-select-option value="pie">饼图</a-select-option>
                <a-select-option value="doughnut">环形图</a-select-option>
              </a-select-opt-group>
            </a-select>
          </div>

          <!-- 图表元素（原子 Setter） -->
          <div class="drawer-section">
            <div class="section-title">图表元素</div>
            <ElementsGridSetter :config="chart.config" @change="updateConfig" />
          </div>

          <!-- 图表颜色（原子 Setter） -->
          <div class="drawer-section">
            <div class="section-title">图表颜色</div>
            <ColorPaletteSetter
              :value="chart.config.colorPalette"
              @change="(colors) => updateConfig({ colorPalette: colors })"
            />
          </div>

          <!-- 数据范围 -->
          <div class="drawer-section">
            <div class="section-title">数据范围</div>
            <div class="range-input-wrapper">
              <a-input
                v-model:value="rangeInputText"
                placeholder="如 A1:C10"
                :class="{ 'is-picking': isPickingRange }"
                @focus="onInputFocus"
                @pressEnter="confirmInputRange"
                @blur="onInputBlur"
              >
                <template #suffix>
                  <check-outlined
                    v-if="isPickingRange || isModified"
                    class="range-icon confirm-icon"
                    title="确认应用 (Enter)"
                    @mousedown.prevent
                    @click="confirmInputRange"
                  />
                  <table-outlined
                    v-else
                    class="range-icon pick-icon"
                    title="重新选择数据范围"
                    @mousedown.prevent
                    @click="togglePickRange"
                  />
                </template>
              </a-input>
            </div>

            <!-- 切换行列快捷按钮与表头标签选项 -->
            <div class="mt-2.5 flex items-center justify-between">
              <a-button
                size="small"
                :type="chart.range.switchRowCol ? 'primary' : 'default'"
                class="switch-btn"
                @click="onToggleSwitchRowCol"
              >
                切换行列
              </a-button>
              <span class="text-xs text-gray-400">
                {{ chart.range.switchRowCol ? '以行作为系列' : '以列作为系列' }}
              </span>
            </div>

            <div class="mt-2 space-y-1 text-xs">
              <div>
                <a-checkbox
                  :checked="chart.range.hasHeaderRow !== false"
                  @change="onHeaderRowChange"
                >
                  首行为标题 / 系列名
                </a-checkbox>
              </div>
              <div>
                <a-checkbox
                  :checked="chart.range.hasHeaderCol !== false"
                  @change="onHeaderColChange"
                >
                  首列为分类标签
                </a-checkbox>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- Tab 2: 元素样式（Schema 声明式驱动，0 模板 v-if 污染） -->
        <a-tab-pane key="style" tab="元素样式">
          <a-collapse
            :bordered="false"
            class="style-collapse"
            :default-active-key="['title', 'axis', 'legend']"
          >
            <a-collapse-panel
              v-for="section in visibleStyleSections"
              :key="section.key"
              :header="section.title"
            >
              <div
                v-for="item in visibleItems(section.items)"
                :key="item.key"
                class="drawer-sub-section"
              >
                <div class="sub-title">{{ item.label }}</div>

                <!-- 动态原子 Setter 映射 -->
                <InputSetter
                  v-if="item.type === 'input'"
                  :value="(chart.config as any)[item.key]"
                  :placeholder="item.placeholder"
                  @change="(val) => onSetterValueChange(item.key, val)"
                />

                <SelectSetter
                  v-else-if="item.type === 'select'"
                  :value="(chart.config as any)[item.key]"
                  :options="item.options"
                  @change="(val) => onSetterValueChange(item.key, val)"
                />

                <NumberRangeSetter
                  v-else-if="item.type === 'number-range'"
                  :min="item.minKey ? (chart.config as any)[item.minKey] : undefined"
                  :max="item.maxKey ? (chart.config as any)[item.maxKey] : undefined"
                  :min-label="item.minLabel"
                  :max-label="item.maxLabel"
                  @change="(r) => onNumberRangeChange(item.minKey, item.maxKey, r)"
                />
              </div>
            </a-collapse-panel>
          </a-collapse>
        </a-tab-pane>
      </a-tabs>

      <div class="drawer-footer">
        <a-button danger block @click="removeChart">删除图表</a-button>
      </div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { TableOutlined, CheckOutlined } from '@ant-design/icons-vue'
import { formatRangeA1, parseRangeA1 } from '@speed-sheet/extension-conditional-format'
import type { SheetChartItem, SheetChartType, SheetChartConfig } from '@speed-sheet/shared'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useChartConfigDrawer } from '../../composables/useChartConfigDrawer'
import { InputSetter, SelectSetter, NumberRangeSetter } from '../../components/setters'
import ColorPaletteSetter from './setters/ColorPaletteSetter.vue'
import ElementsGridSetter from './setters/ElementsGridSetter.vue'
import { chartStyleSections, type SchemaFieldItem } from './schema'

const {
  visible,
  chartId,
  closeDrawer,
  isPickingRange,
  pickingRange,
  startPickingRange,
  cancelPickingRange,
} = useChartConfigDrawer()
const { sheet, revision } = useSheetToolbar()

const activeTab = ref<'general' | 'style'>('general')

const chart = computed<SheetChartItem | null>(() => {
  void revision.value
  const s = sheet.value
  const id = chartId.value
  if (!s || !id) return null
  return s.state.getChart(id)
})

/** 依据当前图表动态计算可见的 Schema Section */
const visibleStyleSections = computed(() => {
  if (!chart.value) return []
  return chartStyleSections.filter((sec) => !sec.hidden || !sec.hidden(chart.value!))
})

function visibleItems(items: SchemaFieldItem[]) {
  if (!chart.value) return []
  return items.filter((it) => !it.hidden || !it.hidden(chart.value!))
}

function onSetterValueChange(key: string, val: any) {
  const patch: Record<string, any> = { [key]: val }
  // 当用户在样式面板输入标题文本时，自动点亮 showTitle
  if (key === 'title') {
    patch.showTitle = true
  }
  // 当用户设置图例方位时，自动点亮 showLegend
  if (key === 'legendPosition') {
    patch.showLegend = true
  }
  updateConfig(patch)
}

function onNumberRangeChange(
  minKey: keyof SheetChartConfig | undefined,
  maxKey: keyof SheetChartConfig | undefined,
  range: { min?: number; max?: number },
) {
  const patch: Partial<SheetChartConfig> = {}
  if (minKey) patch[minKey] = range.min as any
  if (maxKey) patch[maxKey] = range.max as any
  updateConfig(patch)
}

const rangeText = computed(() => {
  if (!chart.value) return ''
  const { row, column } = chart.value.range
  return formatRangeA1(row, column)
})

const rangeInputText = ref('')

watch(
  [rangeText, pickingRange, isPickingRange],
  () => {
    if (isPickingRange.value && pickingRange.value) {
      rangeInputText.value = formatRangeA1(pickingRange.value.row, pickingRange.value.column)
    } else if (!isPickingRange.value) {
      rangeInputText.value = rangeText.value
    }
  },
  { immediate: true, deep: true },
)

const isModified = computed(() => {
  return rangeInputText.value.trim().toUpperCase() !== rangeText.value.toUpperCase()
})

function confirmInputRange() {
  const val = rangeInputText.value.trim()
  const parsed = parseRangeA1(val)
  if (parsed && chart.value && sheet.value) {
    sheet.value.chain().updateSheetChartRange({
      id: chart.value.id,
      range: {
        ...chart.value.range,
        row: parsed.row,
        column: parsed.column,
      },
    }).run()
    rangeInputText.value = formatRangeA1(parsed.row, parsed.column)
  } else {
    rangeInputText.value = rangeText.value
  }
  if (isPickingRange.value) {
    cancelPickingRange()
  }
}

function onInputFocus() {
  if (!isPickingRange.value) {
    togglePickRange()
  }
}

function onInputBlur() {
  if (isPickingRange.value) return
  if (isModified.value) {
    confirmInputRange()
  }
}

function togglePickRange() {
  if (isPickingRange.value) {
    cancelPickingRange()
  } else {
    if (!chart.value) return
    startPickingRange(chart.value.range, (newRange) => {
      if (!chart.value || !sheet.value) return
      sheet.value.chain().updateSheetChartRange({
        id: chart.value.id,
        range: {
          ...chart.value.range,
          row: newRange.row,
          column: newRange.column,
        },
      }).run()
    })
  }
}

function updateType(type: SheetChartType) {
  if (!chart.value || !sheet.value) return
  sheet.value.chain().updateSheetChartConfig({
    id: chart.value.id,
    config: { chartType: type },
  }).run()
}

function updateConfig(config: Partial<SheetChartConfig>) {
  if (!chart.value || !sheet.value) return
  sheet.value.chain().updateSheetChartConfig({
    id: chart.value.id,
    config,
  }).run()
}

function onToggleSwitchRowCol() {
  if (!chart.value) return
  updateRangeHeader('switchRowCol', !chart.value.range.switchRowCol)
}

function updateRangeHeader(key: 'hasHeaderRow' | 'hasHeaderCol' | 'switchRowCol', val: boolean) {
  if (!chart.value || !sheet.value) return
  sheet.value.chain().updateSheetChartRange({
    id: chart.value.id,
    range: {
      ...chart.value.range,
      [key]: val,
    },
  }).run()
}

function onHeaderRowChange(e: any) {
  const checked = e?.target ? Boolean(e.target.checked) : Boolean(e)
  updateRangeHeader('hasHeaderRow', checked)
}

function onHeaderColChange(e: any) {
  const checked = e?.target ? Boolean(e.target.checked) : Boolean(e)
  updateRangeHeader('hasHeaderCol', checked)
}

function removeChart() {
  if (!chart.value || !sheet.value) return
  sheet.value.chain().removeSheetChart({ id: chart.value.id }).run()
  closeDrawer()
}
</script>

<style scoped>
.chart-drawer-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chart-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chart-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
  width: 100%;
}

.chart-tabs :deep(.ant-tabs-nav-wrap) {
  width: 100%;
}

.chart-tabs :deep(.ant-tabs-nav-list) {
  width: 100%;
  display: flex;
}

.chart-tabs :deep(.ant-tabs-tab) {
  flex: 1;
  justify-content: center;
  margin: 0 !important;
  padding: 12px 0;
  font-size: 13px;
}

.chart-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.chart-tabs :deep(.ant-tabs-content) {
  height: 100%;
}

.drawer-section {
  margin-bottom: 18px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ant-color-text, #262626);
  margin-bottom: 8px;
}

.range-input-wrapper {
  margin-bottom: 6px;
}

.range-icon {
  cursor: pointer;
  font-size: 14px;
  color: var(--ant-color-text-tertiary, #8c8c8c);
  transition: all 0.2s;
  padding: 2px;
}

.range-icon:hover {
  color: var(--ant-color-primary, #1677ff);
}

.range-icon.confirm-icon {
  color: var(--speed-chart-primary, #1677ff);
  font-size: 15px;
  margin-right: 4px;
}

.range-icon.confirm-icon:hover {
  color: var(--speed-chart-primary, #1677ff);
  opacity: 0.85;
}

.range-input-wrapper :deep(.ant-input-affix-wrapper.is-picking),
.range-input-wrapper :deep(.is-picking.ant-input-affix-wrapper-focused),
.is-picking {
  border-color: var(--speed-chart-primary, #1677ff) !important;
  box-shadow: 0 0 0 2px var(--speed-chart-primary-bg, rgba(22, 119, 255, 0.15)) !important;
}

.is-picking :deep(.ant-input) {
  color: var(--speed-chart-primary, #1677ff) !important;
  font-weight: 500;
}

.switch-btn {
  font-size: 12px;
  border-radius: 4px;
}

.drawer-sub-section {
  margin-bottom: 14px;
}

.sub-title {
  font-size: 12px;
  color: var(--ant-color-text-secondary, #595959);
  margin-bottom: 6px;
}

.style-collapse {
  background: transparent !important;
}

.style-collapse :deep(.ant-collapse-item) {
  background: transparent !important;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}

.style-collapse :deep(.ant-collapse-header) {
  background: transparent !important;
  padding: 10px 0 !important;
  font-weight: 500;
}

.style-collapse :deep(.ant-collapse-content) {
  background: transparent !important;
}

.style-collapse :deep(.ant-collapse-content-box) {
  background: transparent !important;
  padding: 8px 0 16px 0 !important;
}

.drawer-footer {
  margin-top: auto;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--ant-color-border-secondary, #f0f0f0);
}

:deep(.ant-drawer-body) {
  padding: 0 !important;
}
</style>

<template>
  <a-drawer
    :open="visible"
    :title="`图表设置`"
    placement="right"
    :width="320"
    :mask="false"
    class="sheet-chart-drawer"
    @close="closeDrawer"
  >
    <div v-if="chart" class="chart-drawer-body">
      <a-tabs v-model:activeKey="activeTab">
        <!-- 基础配置 Tab -->
        <a-tab-pane key="data" tab="数据与类型">
          <div class="drawer-section">
            <div class="section-title">图表类型</div>
            <a-select
              :value="chart.config.chartType"
              style="width: 100%"
              @change="(val) => updateType(val as SheetChartType)"
            >
              <a-select-opt-group label="柱状图 / 条形图">
                <a-select-option value="bar">柱状图（平铺）</a-select-option>
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

          <div class="drawer-section">
            <div class="section-title">数据范围</div>
            <div class="range-display">
              <a-tag color="blue">{{ rangeText }}</a-tag>
              <a-button size="small" type="link" @click="useCurrentSelection">使用当前选区</a-button>
            </div>
            <div class="mt-2 space-y-1">
              <div>
                <a-checkbox
                  :checked="chart.range.hasHeaderRow ?? true"
                  @change="(e) => updateRangeHeader('hasHeaderRow', e.target.checked)"
                >
                  首行为标题 / 系列名
                </a-checkbox>
              </div>
              <div>
                <a-checkbox
                  :checked="chart.range.hasHeaderCol ?? true"
                  @change="(e) => updateRangeHeader('hasHeaderCol', e.target.checked)"
                >
                  首列为分类标签
                </a-checkbox>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- 自定义样式 Tab -->
        <a-tab-pane key="style" tab="自定义">
          <div class="drawer-section">
            <div class="section-title">标题设置</div>
            <div class="flex items-center justify-between mb-2">
              <span>显示标题</span>
              <a-switch
                :checked="chart.config.showTitle ?? false"
                @change="(val) => updateConfig({ showTitle: Boolean(val) })"
              />
            </div>
            <a-input
              v-if="chart.config.showTitle"
              :value="chart.config.title"
              placeholder="请输入图表标题"
              @change="(e) => updateConfig({ title: e.target.value })"
            />
          </div>

          <div class="drawer-section">
            <div class="section-title">图例与标签</div>
            <div class="flex items-center justify-between mb-2">
              <span>显示图例</span>
              <a-switch
                :checked="chart.config.showLegend ?? true"
                @change="(val) => updateConfig({ showLegend: Boolean(val) })"
              />
            </div>
            <div v-if="chart.config.showLegend ?? true" class="flex items-center justify-between mb-2">
              <span class="text-xs text-gray-500">图例位置</span>
              <a-select
                size="small"
                style="width: 100px"
                :value="chart.config.legendPosition ?? 'bottom'"
                @change="(val) => updateConfig({ legendPosition: val as any })"
              >
                <a-select-option value="top">上方</a-select-option>
                <a-select-option value="bottom">下方</a-select-option>
                <a-select-option value="left">左侧</a-select-option>
                <a-select-option value="right">右侧</a-select-option>
              </a-select>
            </div>
            <div class="flex items-center justify-between mb-2">
              <span>显示数据标签</span>
              <a-switch
                :checked="chart.config.showDataLabels ?? false"
                @change="(val) => updateConfig({ showDataLabels: Boolean(val) })"
              />
            </div>
            <div class="flex items-center justify-between mb-2">
              <span>显示网格线</span>
              <a-switch
                :checked="chart.config.showGridLines ?? true"
                @change="(val) => updateConfig({ showGridLines: Boolean(val) })"
              />
            </div>
          </div>

          <div class="drawer-section">
            <div class="section-title">坐标轴极值</div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <div class="text-xs text-gray-500 mb-1">最小值</div>
                <a-input-number
                  style="width: 100%"
                  :value="chart.config.yAxisMin"
                  placeholder="自动"
                  @change="(val) => updateConfig({ yAxisMin: val as any })"
                />
              </div>
              <div>
                <div class="text-xs text-gray-500 mb-1">最大值</div>
                <a-input-number
                  style="width: 100%"
                  :value="chart.config.yAxisMax"
                  placeholder="自动"
                  @change="(val) => updateConfig({ yAxisMax: val as any })"
                />
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>

      <div class="drawer-footer">
        <a-button danger block @click="removeChart">删除图表</a-button>
      </div>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { colToLetter } from '@speed-sheet/core'
import type { SheetChartItem, SheetChartType, SheetChartConfig } from '@speed-sheet/shared'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useChartConfigDrawer } from '../../composables/useChartConfigDrawer'

const { visible, chartId, closeDrawer } = useChartConfigDrawer()
const { sheet } = useSheetToolbar()

const activeTab = ref<'data' | 'style'>('data')

const chart = computed<SheetChartItem | null>(() => {
  const s = sheet.value
  const id = chartId.value
  if (!s || !id) return null
  return s.state.getChart(id)
})

const rangeText = computed(() => {
  if (!chart.value) return ''
  const { row, column } = chart.value.range
  const r0 = Math.min(row[0], row[1]) + 1
  const r1 = Math.max(row[0], row[1]) + 1
  const c0 = colToLetter(Math.min(column[0], column[1]))
  const c1 = colToLetter(Math.max(column[0], column[1]))
  return `${c0}${r0}:${c1}${r1}`
})

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

function updateRangeHeader(key: 'hasHeaderRow' | 'hasHeaderCol', val: boolean) {
  if (!chart.value || !sheet.value) return
  sheet.value.chain().updateSheetChartRange({
    id: chart.value.id,
    range: {
      ...chart.value.range,
      [key]: val,
    },
  }).run()
}

function useCurrentSelection() {
  if (!chart.value || !sheet.value) return
  const sel = sheet.value.state.getSelection()
  if (!sel) return
  sheet.value.chain().updateSheetChartRange({
    id: chart.value.id,
    range: {
      row: [sel.row[0], sel.row[1]],
      column: [sel.column[0], sel.column[1]],
      hasHeaderRow: chart.value.range.hasHeaderRow ?? true,
      hasHeaderCol: chart.value.range.hasHeaderCol ?? true,
    },
  }).run()
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

.drawer-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.range-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.drawer-footer {
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>

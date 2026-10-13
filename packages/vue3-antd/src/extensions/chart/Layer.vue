<template>
  <div class="sheet-chart-layer">
    <div
      v-for="chart in charts"
      :key="chart.id"
      class="sheet-chart-container"
      :class="{ 'is-active': activeChartId === chart.id }"
      :style="getChartStyle(chart)"
      @mousedown.stop="onChartMouseDown(chart, $event)"
      @dblclick.stop="openDrawer(chart.id)"
    >
      <!-- 图表头部操作栏 -->
      <div class="chart-header-bar" @mousedown.stop="startDragMove(chart, $event)">
        <span class="chart-title-preview">{{ chart.config.title || '图表' }}</span>
        <div class="chart-actions">
          <setting-outlined class="chart-action-btn" title="设置" @click.stop="openDrawer(chart.id)" />
          <delete-outlined class="chart-action-btn danger" title="删除" @click.stop="removeChart(chart.id)" />
        </div>
      </div>

      <!-- ECharts 渲染容器 -->
      <div :ref="(el) => bindChartDom(chart.id, el as HTMLElement)" class="chart-render-view" />

      <!-- 四角缩放手柄（当激活时） -->
      <template v-if="activeChartId === chart.id">
        <div class="resize-handle handle-br" @mousedown.stop="startResize(chart, $event)" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowReactive, watch } from 'vue'
import * as echarts from 'echarts'
import { SettingOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import {
  computeSheetChartViewportRect,
  extractChartDataset,
  buildEChartsOption,
} from '@speed-sheet/extension-chart'
import type { SheetChartItem } from '@speed-sheet/shared'
import { useSheetViewport } from '@speed-sheet/vue3'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useChartConfigDrawer } from '../../composables/useChartConfigDrawer'

const { sheet, layout, scrollX, scrollY, viewportTick } = useSheetViewport()
const { revision } = useSheetToolbar()
const { openDrawer } = useChartConfigDrawer()

const activeChartId = ref<string | null>(null)
const chartDoms = new Map<string, HTMLElement>()
const chartInstances = shallowReactive(new Map<string, echarts.ECharts>())

const charts = computed<SheetChartItem[]>(() => {
  void revision.value
  void viewportTick.value
  const s = sheet.value
  if (!s) return []
  return s.state.getAllCharts()
})

function getChartStyle(chart: SheetChartItem): Record<string, string> {
  const s = sheet.value
  if (!s) return { display: 'none' }
  const rect = computeSheetChartViewportRect(s, layout.value, chart)
  return {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  }
}

function bindChartDom(id: string, el: HTMLElement | null) {
  if (el) {
    chartDoms.set(id, el)
  } else {
    chartDoms.delete(id)
  }
}

function renderChartInstance(chart: SheetChartItem) {
  const dom = chartDoms.get(chart.id)
  if (!dom || !sheet.value) return

  let instance = chartInstances.get(chart.id)
  if (!instance) {
    instance = echarts.init(dom)
    chartInstances.set(chart.id, instance)
  }

  const dataset = extractChartDataset(sheet.value.state, chart.range)
  const option = buildEChartsOption(dataset, chart.config)
  instance.setOption(option, true)
  instance.resize()
}

function updateAllCharts() {
  nextTick(() => {
    for (const c of charts.value) {
      renderChartInstance(c)
    }
  })
}

watch(
  () => [charts.value, revision.value, viewportTick.value],
  () => {
    updateAllCharts()
  },
  { deep: true, immediate: true }
)

function onChartMouseDown(chart: SheetChartItem, e: MouseEvent) {
  activeChartId.value = chart.id
}

function removeChart(id: string) {
  if (!sheet.value) return
  sheet.value.chain().removeSheetChart({ id }).run()
}

// ---- 拖拽移动 ----
function startDragMove(chart: SheetChartItem, startEvent: MouseEvent) {
  activeChartId.value = chart.id
  const startX = startEvent.clientX
  const startY = startEvent.clientY
  const origLeft = chart.offsetLeft ?? 0
  const origTop = chart.offsetTop ?? 0

  function onMouseMove(e: MouseEvent) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    if (!sheet.value) return
    sheet.value.chain().updateSheetChartRect({
      id: chart.id,
      offsetLeft: origLeft + dx,
      offsetTop: origTop + dy,
    }).run()
  }

  function onMouseUp() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// ---- 右下角拖拽缩放 ----
function startResize(chart: SheetChartItem, startEvent: MouseEvent) {
  const startX = startEvent.clientX
  const startY = startEvent.clientY
  const origW = chart.width
  const origH = chart.height

  function onMouseMove(e: MouseEvent) {
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    const newW = Math.max(200, origW + dx)
    const newH = Math.max(150, origH + dy)
    if (!sheet.value) return
    sheet.value.chain().updateSheetChartRect({
      id: chart.id,
      width: newW,
      height: newH,
    }).run()
    chartInstances.get(chart.id)?.resize()
  }

  function onMouseUp() {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

onUnmounted(() => {
  chartInstances.forEach((inst) => inst.dispose())
  chartInstances.clear()
})
</script>

<style scoped>
.sheet-chart-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.sheet-chart-container {
  position: absolute;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  pointer-events: auto;
  user-select: none;
  display: flex;
  flex-direction: column;
}

.sheet-chart-container.is-active {
  border-color: #1677ff;
  box-shadow: 0 0 0 1px #1677ff, 0 4px 12px rgba(22, 119, 255, 0.15);
}

.chart-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 8px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  cursor: move;
  font-size: 12px;
  color: #666;
}

.chart-title-preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chart-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chart-action-btn {
  cursor: pointer;
  font-size: 13px;
  color: #8c8c8c;
  transition: color 0.2s;
}

.chart-action-btn:hover {
  color: #1677ff;
}

.chart-action-btn.danger:hover {
  color: #ff4d4f;
}

.chart-render-view {
  flex: 1;
  width: 100%;
  height: calc(100% - 28px);
}

.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #ffffff;
  border: 2px solid #1677ff;
  border-radius: 2px;
}

.handle-br {
  right: -5px;
  bottom: -5px;
  cursor: se-resize;
}
</style>

<template>
  <div class="sheet-chart-layer">
    <!-- 选区拾取模式：顶部提示条（对标语雀） -->
    <div v-if="isPickingRange" class="chart-pick-banner">
      <info-circle-filled />
      <span>请选择新的数据范围，按 ESC 取消</span>
    </div>

    <!-- 选区拾取模式：纯粹的蓝色虚线选区框（无任何花哨彩色角标） -->
    <div
      v-if="isPickingRange && pickingBoxRect"
      class="chart-picking-selection"
      :style="{
        left: `${pickingBoxRect.x}px`,
        top: `${pickingBoxRect.y}px`,
        width: `${pickingBoxRect.w}px`,
        height: `${pickingBoxRect.h}px`,
      }"
    />

    <!-- 选区拾取模式：选区右下角确认胶囊按钮（对标语雀） -->
    <div
      v-if="isPickingRange && pickConfirmBtnPos"
      class="chart-pick-confirm-btn"
      :style="pickConfirmBtnPos"
      @mousedown.stop
      @click="confirmPickingRange"
    >
      确认(Enter)
    </div>

    <!-- 常态（确定后）：图表引用的行列高亮边框（系列名-绿，分类-橙，数据-蓝） -->
    <template v-if="!isPickingRange">
      <div
        v-for="(hl, idx) in rangeHighlights"
        :key="idx"
        class="chart-range-highlight"
        :style="{
          left: `${hl.x}px`,
          top: `${hl.y}px`,
          width: `${hl.w}px`,
          height: `${hl.h}px`,
          borderColor: hl.color,
          backgroundColor: hl.bg,
        }"
      >
        <span
          class="chart-range-badge"
          :class="{ 'badge-inside': hl.insideBadge }"
          :style="{ backgroundColor: hl.color }"
        >
          {{ hl.label }}
        </span>
      </div>
    </template>

    <div
      v-for="chart in charts"
      :key="chart.id"
      class="sheet-chart-container"
      :class="{
        'is-active': editable && (activeChartId === chart.id || (drawerVisible && drawerChartId === chart.id)),
        'is-readonly': !editable,
      }"
      :style="getChartStyle(chart)"
      @mousedown.stop="onChartMouseDown(chart, $event)"
      @dblclick.stop="editable ? openDrawer(chart.id) : undefined"
    >
      <!-- 图表头部操作栏（仅编辑态展示） -->
      <div v-if="editable" class="chart-header-bar" @mousedown.stop="startDragMove(chart, $event)">
        <span class="chart-title-preview">{{ chart.config.title || '图表' }}</span>
        <div class="chart-actions">
          <setting-outlined class="chart-action-btn" title="设置" @click.stop="openDrawer(chart.id)" />
          <delete-outlined class="chart-action-btn danger" title="删除" @click.stop="removeChart(chart.id)" />
        </div>
      </div>

      <!-- ECharts 渲染容器 -->
      <div :ref="(el) => bindChartDom(chart.id, el as HTMLElement)" class="chart-render-view" />

      <!-- 八向缩放手柄（当激活且可编辑时） -->
      <ResizeHandles
        v-if="editable && (activeChartId === chart.id || (drawerVisible && drawerChartId === chart.id))"
        color="var(--speed-chart-primary, #1677ff)"
        :size="8"
        @resize-start="(handle: ResizeHandleDirection, $event: MouseEvent) => onResizeStart(chart, handle, $event)"
      />

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowReactive, watch } from 'vue'
import { SettingOutlined, DeleteOutlined, InfoCircleFilled } from '@ant-design/icons-vue'
import { buildSheetGridMetrics, selectionBox } from '@speed-sheet/core'
import {
  computeSheetChartViewportRect,
  extractChartDataset,
  buildEChartsOption,
} from '@speed-sheet/extension-chart'
import type { SheetChartItem } from '@speed-sheet/shared'
import { useSheetViewport } from '@speed-sheet/vue3'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useChartConfigDrawer } from '../../composables/useChartConfigDrawer'
import ResizeHandles from '../../components/ResizeHandles.vue'
import { useBoxResize, type ResizeHandleDirection } from '../../composables/useBoxResize'
import { echarts, type ECharts } from './echarts'

const { sheet, layout, scrollX, scrollY, viewportTick, editable } = useSheetViewport()
const { revision } = useSheetToolbar()
const {
  visible: drawerVisible,
  chartId: drawerChartId,
  activeChartId,
  isPickingRange,
  pickingRange,
  updatePickingRange,
  confirmPickingRange,
  cancelPickingRange,
  openDrawer,
} = useChartConfigDrawer()

const chartDoms = new Map<string, HTMLElement>()
const chartInstances = shallowReactive(new Map<string, ECharts>())


interface RangeHighlightBox {
  type: 'series' | 'category' | 'data'
  x: number
  y: number
  w: number
  h: number
  color: string
  bg: string
  label: string
  insideBadge: boolean
}

const activeChart = computed<SheetChartItem | null>(() => {
  void revision.value
  void viewportTick.value
  const targetId = drawerVisible.value ? drawerChartId.value : activeChartId.value
  if (!targetId || !sheet.value) return null
  return sheet.value.state.getChart(targetId)
})

const targetRange = computed(() => {
  if (isPickingRange.value && pickingRange.value) {
    return {
      row: pickingRange.value.row,
      column: pickingRange.value.column,
      hasHeaderRow: activeChart.value?.range.hasHeaderRow ?? true,
      hasHeaderCol: activeChart.value?.range.hasHeaderCol ?? true,
      switchRowCol: activeChart.value?.range.switchRowCol ?? false,
    }
  }
  return activeChart.value?.range ?? null
})

const rangeHighlights = computed<RangeHighlightBox[]>(() => {
  // 只读态不展示编辑引用选区高亮
  if (!editable.value) return []
  // 选区拾取过程中不显示彩色分区（确定后再显示！）
  if (isPickingRange.value) return []

  void revision.value
  void viewportTick.value
  const r = targetRange.value
  const s = sheet.value
  const l = layout.value
  if (!r || !s || !l) return []

  const { row, column, hasHeaderRow = true, hasHeaderCol = true, switchRowCol = false } = r
  const minR = Math.min(row[0], row[1])
  const maxR = Math.max(row[0], row[1])
  const minC = Math.min(column[0], column[1])
  const maxC = Math.max(column[0], column[1])

  const M = buildSheetGridMetrics(s, l)
  const RHW = l.rowHeaderWidth
  const CHH = l.columnHeaderHeight
  const vw = l.viewportW ?? window.innerWidth
  const vh = l.viewportH ?? window.innerHeight

  function toBox(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
    type: 'series' | 'category' | 'data',
    color: string,
    bg: string,
    label: string,
  ): RangeHighlightBox | null {
    if (r0 > r1 || c0 > c1) return null
    const box = selectionBox(l, M, r0, c0, r1, c1)
    if (box.w <= 0 || box.h <= 0) return null

    // 裁剪在内容区之内，防止越过行头/列头
    const sl = Math.max(RHW, box.x)
    const st = Math.max(CHH, box.y)
    const sr = Math.min(vw, box.x + box.w)
    const sb = Math.min(vh, box.y + box.h)
    const sw = sr - sl
    const sh = sb - st
    if (sw <= 0 || sh <= 0) return null

    return {
      type,
      x: sl,
      y: st,
      w: sw,
      h: sh,
      color,
      bg,
      label,
      insideBadge: st <= CHH + 20,
    }
  }

  const list: RangeHighlightBox[] = []
  const showSeries = hasHeaderRow !== false
  const showCategory = hasHeaderCol !== false
  const isSwitched = Boolean(switchRowCol)

  // 1. 首行高亮
  // 若未切换行列：作为系列名 (绿色)
  // 若切换行列：作为分类标签 (橙色)
  if (showSeries) {
    const startCol = showCategory && maxC > minC ? minC + 1 : minC
    const color = isSwitched ? '#fa8c16' : '#52c41a'
    const bg = isSwitched ? 'rgba(250, 140, 22, 0.08)' : 'rgba(82, 196, 26, 0.08)'
    const label = isSwitched ? '分类' : '系列名'
    const box = toBox(minR, startCol, minR, maxC, isSwitched ? 'category' : 'series', color, bg, label)
    if (box) list.push(box)
  }

  // 2. 首列高亮
  // 若未切换行列：作为分类标签 (橙色)
  // 若切换行列：作为系列名 (绿色)
  if (showCategory) {
    const startRow = showSeries && maxR > minR ? minR + 1 : minR
    const color = isSwitched ? '#52c41a' : '#fa8c16'
    const bg = isSwitched ? 'rgba(82, 196, 26, 0.08)' : 'rgba(250, 140, 22, 0.08)'
    const label = isSwitched ? '系列名' : '分类'
    const box = toBox(startRow, minC, maxR, minC, isSwitched ? 'series' : 'category', color, bg, label)
    if (box) list.push(box)
  }

  // 3. 数据主体区域 (蓝色)
  const dataStartRow = showSeries && maxR > minR ? minR + 1 : minR
  const dataStartCol = showCategory && maxC > minC ? minC + 1 : minC
  const dataBox = toBox(
    dataStartRow,
    dataStartCol,
    maxR,
    maxC,
    'data',
    '#1677ff',
    'rgba(22, 119, 255, 0.08)',
    '数据',
  )
  if (dataBox) list.push(dataBox)

  return list
})

const pickingBoxRect = computed(() => {
  if (!isPickingRange.value || !targetRange.value || !sheet.value || !layout.value) return null
  void viewportTick.value
  const l = layout.value
  const s = sheet.value
  const { row, column } = targetRange.value
  const minR = Math.min(row[0], row[1])
  const maxR = Math.max(row[0], row[1])
  const minC = Math.min(column[0], column[1])
  const maxC = Math.max(column[0], column[1])

  const M = buildSheetGridMetrics(s, l)
  const RHW = l.rowHeaderWidth
  const CHH = l.columnHeaderHeight
  const vw = l.viewportW ?? window.innerWidth
  const vh = l.viewportH ?? window.innerHeight

  const box = selectionBox(l, M, minR, minC, maxR, maxC)
  if (box.w <= 0 || box.h <= 0) return null

  const sl = Math.max(RHW, box.x)
  const st = Math.max(CHH, box.y)
  const sr = Math.min(vw, box.x + box.w)
  const sb = Math.min(vh, box.y + box.h)
  const sw = sr - sl
  const sh = sb - st
  if (sw <= 0 || sh <= 0) return null

  return { x: sl, y: st, w: sw, h: sh }
})

const pickConfirmBtnPos = computed(() => {
  if (!isPickingRange.value || !pickingBoxRect.value || !layout.value) return null
  const l = layout.value
  const rect = pickingBoxRect.value
  return {
    left: `${Math.max(l.rowHeaderWidth + 8, rect.x + rect.w - 110)}px`,
    top: `${rect.y + rect.h + 8}px`,
  }
})

const selection = computed(() => {
  void revision.value
  return sheet.value?.state.getSelection()
})

watch(selection, (sel) => {
  if (isPickingRange.value && sel) {
    updatePickingRange({
      row: [sel.row[0], sel.row[1]],
      column: [sel.column[0], sel.column[1]],
    })
  }
})

function onWindowKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isPickingRange.value) {
      e.preventDefault()
      cancelPickingRange()
    } else if (activeChartId.value && !drawerVisible.value) {
      e.preventDefault()
      activeChartId.value = null
    }
  } else if (e.key === 'Enter') {
    if (isPickingRange.value) {
      e.preventDefault()
      confirmPickingRange()
    }
  }
}

watch([isPickingRange, activeChartId], ([picking, active]) => {
  if (picking || active) {
    window.addEventListener('keydown', onWindowKeyDown)
  } else {
    window.removeEventListener('keydown', onWindowKeyDown)
  }
})

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
  if (!editable.value) return
  activeChartId.value = chart.id
}

function removeChart(id: string) {
  if (!sheet.value) return
  sheet.value.chain().removeSheetChart({ id }).run()
}

// ---- 拖拽移动 ----
function startDragMove(chart: SheetChartItem, startEvent: MouseEvent) {
  if (!editable.value) return
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

const currentResizingChartId = ref<string | null>(null)
const { startResize } = useBoxResize({
  minWidth: 200,
  minHeight: 150,
  onResizing: (newRect) => {
    const id = currentResizingChartId.value
    if (!id || !sheet.value) return
    sheet.value.chain().updateSheetChartRect({
      id,
      offsetLeft: newRect.left,
      offsetTop: newRect.top,
      width: newRect.width,
      height: newRect.height,
    }).run()
    chartInstances.get(id)?.resize()
  },
  onResizeEnd: () => {
    currentResizingChartId.value = null
  },
})

function onResizeStart(chart: SheetChartItem, handle: ResizeHandleDirection, e: MouseEvent) {
  currentResizingChartId.value = chart.id
  startResize(
    handle,
    {
      left: chart.offsetLeft ?? 0,
      top: chart.offsetTop ?? 0,
      width: chart.width,
      height: chart.height,
    },
    e,
  )
}

function onGlobalMouseDown(e: MouseEvent) {
  if (drawerVisible.value) return
  const target = e.target as HTMLElement | null
  if (target?.closest('.sheet-chart-container') || target?.closest('.sheet-chart-drawer')) return
  activeChartId.value = null
}

onMounted(() => {
  window.addEventListener('mousedown', onGlobalMouseDown)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', onGlobalMouseDown)
  window.removeEventListener('keydown', onWindowKeyDown)
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
  overflow: hidden;
}

.chart-pick-banner {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 110;
  padding: 6px 18px;
  border-radius: 4px;
  background: var(--speed-chart-primary, #1677ff);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  pointer-events: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 6px;
}

.chart-pick-confirm-btn {
  position: absolute;
  z-index: 100;
  pointer-events: auto;
  background: var(--ant-color-bg-container, #ffffff);
  border: 1px solid var(--ant-color-border, #d9d9d9);
  color: var(--ant-color-text, #262626);
  font-size: 13px;
  font-weight: 400;
  padding: 6px 18px;
  border-radius: 4px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.chart-pick-confirm-btn:hover {
  background: var(--ant-color-fill-quaternary, #fafafa);
  border-color: var(--speed-chart-primary, #1677ff);
  color: var(--speed-chart-primary, #1677ff);
  box-shadow: 0 6px 18px rgba(22, 119, 255, 0.15);
}


.chart-picking-selection {
  position: absolute;
  pointer-events: none;
  border: 2px dashed var(--speed-chart-selection-border, #1677ff);
  background-color: var(--speed-chart-primary-bg, rgba(22, 119, 255, 0.08));
  box-sizing: border-box;
  z-index: 3;
}

.chart-range-highlight {
  position: absolute;
  pointer-events: none;
  border-width: 2px;
  border-style: solid;
  border-radius: 2px;
  box-sizing: border-box;
  z-index: 2;
  transition: all 0.1s ease-out;
}

.chart-range-badge {
  position: absolute;
  top: -18px;
  left: -2px;
  color: #fff;
  font-size: 11px;
  line-height: 13px;
  padding: 1px 5px;
  border-radius: 3px;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  font-weight: 500;
}

.chart-range-badge.badge-inside {
  top: 2px;
  left: 2px;
}

.sheet-chart-container {
  position: absolute;
  background: var(--ant-color-bg-container, #ffffff);
  border: 1px solid var(--ant-color-border, #d9d9d9);
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  pointer-events: auto;
  user-select: none;
  display: flex;
  flex-direction: column;
  z-index: 20;
}

.sheet-chart-container.is-active {
  z-index: 30;
  border-color: var(--speed-chart-primary, #1677ff);
  box-shadow: 0 0 0 1px var(--speed-chart-primary, #1677ff), 0 4px 12px rgba(22, 119, 255, 0.15);
}

.chart-header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 28px;
  padding: 0 8px;
  background: var(--ant-color-fill-quaternary, #fafafa);
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 0;
  cursor: move;
  color: var(--ant-color-text-secondary, #666666);
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
  color: var(--ant-color-text-tertiary, #8c8c8c);
  transition: color 0.2s;
}

.chart-action-btn:hover {
  color: var(--speed-chart-primary, #1677ff);
}

.chart-action-btn.danger:hover {
  color: var(--ant-color-error, #ff4d4f);
}

.chart-render-view {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.sheet-chart-container.is-readonly {
  user-select: auto;
}
</style>



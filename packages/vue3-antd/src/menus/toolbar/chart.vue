<template>
  <s-keymap-tip :title="editableCpt ? '插入图表' : null">
    <a-dropdown :trigger="['click']" :disabled="!editableCpt">
      <a-button type="text" class="shadow-btn-wrapper" :disabled="!editableCpt">
        <span class="inline-flex items-center justify-center gap-0.5">
          <BarChartOutlined style="font-size: 15px;" />
          <DownOutlined style="font-size: 10px; color: #8c8c8c;" />
        </span>
      </a-button>

      <template #overlay>
        <div class="chart-menu-overlay" @mousedown.stop>
          <div class="menu-group-title">柱状图 / 条形图</div>
          <div class="chart-card-grid">
            <div class="chart-card-item" @click="insertChart('bar')">
              <div class="chart-preview-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="#1677ff">
                  <rect x="4" y="10" width="3" height="10" rx="1" />
                  <rect x="10" y="5" width="3" height="15" rx="1" />
                  <rect x="16" y="8" width="3" height="12" rx="1" />
                </svg>
              </div>
              <span class="chart-card-name">柱状图</span>
            </div>
            <div class="chart-card-item" @click="insertChart('bar-stacked')">
              <div class="chart-preview-icon">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <rect x="4" y="14" width="3" height="6" rx="1" fill="#1677ff" />
                  <rect x="4" y="8" width="3" height="5" rx="1" fill="#52c41a" />
                  <rect x="10" y="11" width="3" height="9" rx="1" fill="#1677ff" />
                  <rect x="10" y="4" width="3" height="6" rx="1" fill="#52c41a" />
                  <rect x="16" y="13" width="3" height="7" rx="1" fill="#1677ff" />
                  <rect x="16" y="7" width="3" height="5" rx="1" fill="#52c41a" />
                </svg>
              </div>
              <span class="chart-card-name">堆叠柱状图</span>
            </div>
            <div class="chart-card-item" @click="insertChart('bar-horizontal')">
              <div class="chart-preview-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="#1677ff">
                  <rect x="4" y="4" width="10" height="3" rx="1" />
                  <rect x="4" y="10" width="15" height="3" rx="1" />
                  <rect x="4" y="16" width="12" height="3" rx="1" />
                </svg>
              </div>
              <span class="chart-card-name">条形图</span>
            </div>
          </div>

          <div class="menu-group-title mt-2">折线图 / 面积图</div>
          <div class="chart-card-grid">
            <div class="chart-card-item" @click="insertChart('line')">
              <div class="chart-preview-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#1677ff" stroke-width="2">
                  <polyline points="4,16 9,8 14,14 20,6" />
                </svg>
              </div>
              <span class="chart-card-name">折线图</span>
            </div>
            <div class="chart-card-item" @click="insertChart('line-smooth')">
              <div class="chart-preview-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#52c41a" stroke-width="2">
                  <path d="M4 16 C9 8, 14 14, 20 6" />
                </svg>
              </div>
              <span class="chart-card-name">平滑折线图</span>
            </div>
            <div class="chart-card-item" @click="insertChart('area-stacked')">
              <div class="chart-preview-icon">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="#1677ff" fill-opacity="0.3" stroke="#1677ff" stroke-width="1.5">
                  <polygon points="4,18 4,14 10,8 16,12 20,6 20,18" />
                </svg>
              </div>
              <span class="chart-card-name">面积图</span>
            </div>
          </div>

          <div class="menu-group-title mt-2">饼图 / 环形图</div>
          <div class="chart-card-grid">
            <div class="chart-card-item" @click="insertChart('pie')">
              <div class="chart-preview-icon">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <circle cx="12" cy="12" r="9" fill="#1677ff" />
                  <path d="M12 12 L12 3 A9 9 0 0 1 21 12 Z" fill="#52c41a" />
                </svg>
              </div>
              <span class="chart-card-name">饼图</span>
            </div>
            <div class="chart-card-item" @click="insertChart('doughnut')">
              <div class="chart-preview-icon">
                <svg viewBox="0 0 24 24" width="28" height="28">
                  <circle cx="12" cy="12" r="8" fill="none" stroke="#1677ff" stroke-width="4" />
                  <path d="M12 4 A8 8 0 0 1 20 12" fill="none" stroke="#52c41a" stroke-width="4" />
                </svg>
              </div>
              <span class="chart-card-name">环形图</span>
            </div>
          </div>
        </div>
      </template>
    </a-dropdown>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { BarChartOutlined, DownOutlined } from '@ant-design/icons-vue'
import type { SheetChartType } from '@speed-sheet/shared'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useChartConfigDrawerOptional } from '../../composables/useChartConfigDrawer'

const { sheet, editableCpt } = useSheetToolbar()
const chartDrawer = useChartConfigDrawerOptional()

function insertChart(type: SheetChartType) {
  const s = sheet.value
  if (!s) return
  const sel = s.state.getSelection()
  const r0 = Math.min(sel.row[0], sel.row[1])
  const r1 = Math.max(sel.row[0], sel.row[1])
  const c0 = Math.min(sel.column[0], sel.column[1])
  const c1 = Math.max(sel.column[0], sel.column[1])

  // 如果当前只选中了单个单元格，自动智能扩展默认推荐示例范围（例如 4行 x 3列）
  let targetRow: [number, number] = [r0, r1]
  let targetCol: [number, number] = [c0, c1]
  if (r0 === r1 && c0 === c1) {
    targetRow = [r0, Math.min(s.state.getRowCount() - 1, r0 + 3)]
    targetCol = [c0, Math.min(s.state.getColCount() - 1, c0 + 2)]
  }

  const id = `chart_${Date.now()}`
  s.chain().insertSheetChart({
    r: r0,
    c: c0,
    range: {
      row: targetRow,
      column: targetCol,
      hasHeaderRow: true,
      hasHeaderCol: true,
    },
    type,
    id,
  }).run()

  // 插入后自动打开配置抽屉
  chartDrawer?.openDrawer(id)
}
</script>

<style scoped>
.chart-menu-overlay {
  background: #ffffff;
  padding: 12px;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  width: 250px;
}

.menu-group-title {
  font-size: 12px;
  font-weight: 500;
  color: #8c8c8c;
  margin-bottom: 6px;
}

.chart-card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.chart-card-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.chart-card-item:hover {
  background: #f6faff;
  border-color: #91caff;
  transform: translateY(-1px);
}

.chart-preview-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
}

.chart-card-name {
  font-size: 11px;
  color: #555;
  margin-top: 4px;
  text-align: center;
}
</style>

<template>
  <div class="elements-grid-setter">
    <!-- 图例 -->
    <div class="element-grid-item">
      <a-checkbox
        :checked="config.showLegend ?? true"
        @change="(e: any) => emitChange({ showLegend: Boolean(e.target.checked) })"
      >
        图例
      </a-checkbox>
      <span
        v-if="config.showLegend ?? true"
        class="more-setting-arrow"
        title="更多设置"
        @click.stop="onJumpStyle('legend')"
      >
        <setting-outlined />
      </span>
    </div>

    <!-- 网格线 -->
    <div class="element-grid-item">
      <a-checkbox
        :checked="config.showGridLines ?? true"
        @change="(e: any) => emitChange({ showGridLines: Boolean(e.target.checked) })"
      >
        网格线
      </a-checkbox>
    </div>

    <!-- 坐标轴 -->
    <div class="element-grid-item">
      <a-checkbox
        :checked="config.showAxis ?? true"
        @change="(e: any) => emitChange({ showAxis: Boolean(e.target.checked) })"
      >
        坐标轴
      </a-checkbox>
      <span
        v-if="config.showAxis ?? true"
        class="more-setting-arrow"
        title="更多设置"
        @click.stop="onJumpStyle('axis')"
      >
        <setting-outlined />
      </span>
    </div>

    <!-- 图表标题 -->
    <div class="element-grid-item">
      <a-checkbox
        :checked="config.showTitle ?? false"
        @change="(e: any) => emitChange({ showTitle: Boolean(e.target.checked) })"
      >
        图表标题
      </a-checkbox>
      <span
        v-if="config.showTitle ?? false"
        class="more-setting-arrow"
        title="更多设置"
        @click.stop="onJumpStyle('title')"
      >
        <setting-outlined />
      </span>
    </div>

    <!-- 数据标签 -->
    <div class="element-grid-item">
      <a-checkbox
        :checked="config.showDataLabels ?? false"
        @change="(e: any) => emitChange({ showDataLabels: Boolean(e.target.checked) })"
      >
        数据标签
      </a-checkbox>
    </div>

    <!-- 轴标题 -->
    <div class="element-grid-item">
      <a-checkbox
        :checked="Boolean(config.xAxisTitle || config.yAxisTitle)"
        @change="(e: any) => onToggleAxisTitle(Boolean(e.target.checked))"
      >
        轴标题
      </a-checkbox>
      <span
        v-if="Boolean(config.xAxisTitle || config.yAxisTitle)"
        class="more-setting-arrow"
        title="更多设置"
        @click.stop="onJumpStyle('axis')"
      >
        <setting-outlined />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RightOutlined, SettingOutlined } from '@ant-design/icons-vue'
import type { SheetChartConfig } from '@speed-sheet/shared'

const props = defineProps<{
  config: SheetChartConfig
}>()

const emit = defineEmits<{
  change: [patch: Partial<SheetChartConfig>]
  jumpStyle: [sectionKey: string]
}>()

function emitChange(patch: Partial<SheetChartConfig>) {
  emit('change', patch)
}

function onJumpStyle(sectionKey: string) {
  emit('jumpStyle', sectionKey)
}

function onToggleAxisTitle(checked: boolean) {
  if (checked) {
    emitChange({
      xAxisTitle: props.config.xAxisTitle || '分类轴',
      yAxisTitle: props.config.yAxisTitle || '数值轴',
    })
  } else {
    emitChange({
      xAxisTitle: '',
      yAxisTitle: '',
    })
  }
}
</script>

<style scoped>
.elements-grid-setter {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  row-gap: 8px;
  column-gap: 12px;
  padding: 10px 12px;
  background: var(--ant-color-fill-quaternary, #f9f9f9);
  border-radius: 6px;
  width: 100%;
}

.element-grid-item {
  display: flex;
  align-items: center;
  min-height: 24px;
}

.more-setting-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 11px;
  color: var(--ant-color-text-tertiary, #8c8c8c);
  cursor: pointer;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s, background-color 0.2s;
  user-select: none;
}

.element-grid-item:hover .more-setting-arrow {
  opacity: 1;
}

.more-setting-arrow:hover {
  color: var(--speed-chart-primary, #1677ff);
  background: rgba(22, 119, 255, 0.1);
}
</style>

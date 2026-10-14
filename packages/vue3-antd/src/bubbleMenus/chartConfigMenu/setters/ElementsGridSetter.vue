<template>
  <div class="elements-grid-setter">
    <a-checkbox
      :checked="config.showLegend ?? true"
      @change="(e: any) => emitChange({ showLegend: Boolean(e.target.checked) })"
    >
      图例
    </a-checkbox>
    <a-checkbox
      :checked="config.showGridLines ?? true"
      @change="(e: any) => emitChange({ showGridLines: Boolean(e.target.checked) })"
    >
      网格线
    </a-checkbox>
    <a-checkbox
      :checked="config.showAxis ?? true"
      @change="(e: any) => emitChange({ showAxis: Boolean(e.target.checked) })"
    >
      坐标轴
    </a-checkbox>
    <a-checkbox
      :checked="config.showTitle ?? false"
      @change="(e: any) => emitChange({ showTitle: Boolean(e.target.checked) })"
    >
      图表标题
    </a-checkbox>
    <a-checkbox
      :checked="config.showDataLabels ?? false"
      @change="(e: any) => emitChange({ showDataLabels: Boolean(e.target.checked) })"
    >
      数据标签
    </a-checkbox>
    <a-checkbox
      :checked="Boolean(config.xAxisTitle || config.yAxisTitle)"
      @change="(e: any) => onToggleAxisTitle(Boolean(e.target.checked))"
    >
      轴标题
    </a-checkbox>
  </div>
</template>

<script setup lang="ts">
import type { SheetChartConfig } from '@speed-sheet/shared'

const props = defineProps<{
  config: SheetChartConfig
}>()

const emit = defineEmits<{
  change: [patch: Partial<SheetChartConfig>]
}>()

function emitChange(patch: Partial<SheetChartConfig>) {
  emit('change', patch)
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
  row-gap: 10px;
  column-gap: 12px;
  padding: 10px 12px;
  background: var(--ant-color-fill-quaternary, #f9f9f9);
  border-radius: 6px;
  width: 100%;
}
</style>

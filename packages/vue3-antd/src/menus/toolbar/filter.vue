<template>
  <s-keymap-tip :title="editableCpt ? '筛选' : null">
    <a-button
      type="text"
      :class="['shadow-btn-wrapper', filterHighlight ? 'is-active' : '']"
      :disabled="!editableCpt"
      @click="onFilter"
    >
      <filter-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import { FilterOutlined } from '@ant-design/icons-vue'
import {
  clearFilter,
  hasFilterSession,
  prepareFilterScope,
} from '@speed-sheet/extension-filter'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useFilterConfigPanelOptional } from '../../composables/useFilterConfigPanel'

const { sheet, revision, editableCpt } = useSheetToolbar()
const filterPanel = useFilterConfigPanelOptional()

const filterHighlight = computed(() => {
  void revision.value
  const s = sheet.value
  return s ? hasFilterSession(s) : false
})

function selectionAnchor(): { r: number; c: number } {
  const sel = sheet.value!.state.getSelection()
  return {
    r: Math.min(sel.row[0], sel.row[1]),
    c: Math.min(sel.column[0], sel.column[1]),
  }
}

/**
 * 工具栏筛选：取消 → 设置 循环
 * - 已有筛选会话或面板打开 → 仅清除
 * - 否则 → 按当前选区创建筛选并打开面板
 */
function onFilter(): void {
  const s = sheet.value
  if (!s || !filterPanel) return

  if (hasFilterSession(s) || filterPanel.open.value) {
    filterPanel.closePanel()
    clearFilter(s)
    return
  }

  const { r, c } = selectionAnchor()
  const ok = prepareFilterScope(s)
  if (!ok) {
    message.warning('请选择要筛选的列')
    return
  }
  filterPanel.openPanel({ r, c })
}
</script>

<style scoped lang="less">

</style>

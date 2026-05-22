<template>
  <SheetRenderer
    :selection="selection"
    :sheetNames="sheetNames"
    :activeSheetName="activeSheetId"
    :cells="allCells"
    :sheet="sheet"
    :showToolbar="ui.showToolbar"
    :showSheetBar="ui.showSheetTabs"
    :showFormulaBar="ui.showFormulaBar"
    :rowHeaderWidth="ui.rowHeaderWidth"
    :columnHeaderHeight="ui.columnHeaderHeight"
    @cell-click="onCellClick"
    @switch-sheet="switchSheet"
  >
    <template v-if="ui.showToolbar" #toolbar>
      <Toolbar :sheet="sheet" :selection="selection" :cells="allCells" />
    </template>
  </SheetRenderer>
</template>

<script setup lang="ts">
import { computed, withDefaults } from 'vue'
import { SheetRenderer, useSheet } from '@speed-sheet/vue3'
import type { SheetOptions } from '@speed-sheet/core'
import type { SpeedSheetProps } from './types'
import Toolbar from './components/Toolbar.vue'
/** Fortune Sheet 风格：`<SpeedSheet :sheet-data="file" :show-toolbar="true" />` */
const props = withDefaults(defineProps<SpeedSheetProps>(), {
  showToolbar: true,
  showSheetTabs: true,
  showFormulaBar: true,
  lang: 'zh',
})

const ui = computed(() => ({
  showToolbar: props.showToolbar ?? true,
  showSheetTabs: props.showSheetTabs ?? true,
  showFormulaBar: props.showFormulaBar ?? true,
  rowHeaderWidth: props.rowHeaderWidth,
  columnHeaderHeight: props.columnHeaderHeight,
}))

/** Fortune `data` → sheetData（Vue 里不要用 prop 名 data） */
const workbookFile = computed(() => props.sheetData ?? props.data)

const sheetOptions = computed<SheetOptions>(() => ({
  data: workbookFile.value,
  snapshot: props.snapshot,
  extensions: props.extensions,
  ydoc: props.ydoc,
  onUpdate: (s) => {
    const file = s.toLuckysheetFile()
    if (file) props.onChange?.(file)
  },
}))

const { sheet, selection, activeSheetId, sheetNames, allCells, switchSheet } = useSheet(sheetOptions)

function onCellClick(r: number, c: number): void {
  sheet.value?.chain().selectCell({ r, c }).run()
}
</script>

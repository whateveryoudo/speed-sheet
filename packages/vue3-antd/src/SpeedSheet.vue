<template>
  <SheetRenderer
    class="speed-sheet"
    ref="rendererRef"
    :view="rendererView"
    :chrome="rendererChrome"
    @cell-click="onCellClick"
    @select-range="onSelectRange"
    @switch-sheet="switchSheet"
  >
    <template v-if="ui.showToolbar" #toolbar>
      <SheetToolbarMenuBar
        :toolbar-keys="props.toolbarKeys"
        :exclude-keys="props.excludeToolbarKeys"
      />
    </template>
    <template #context-menu="{ r, c, clientX, clientY, close }">
      <CellContextMenu
        open
        :r="r"
        :c="c"
        :client-x="clientX"
        :client-y="clientY"
        :sheet="sheet"
        :selection="selection"
        :lang="props.lang"
        :menu-keys="props.cellContextMenu"
        :exclude-keys="props.excludeContextMenuKeys"
        :boundary="viewportEl"
        @close="close"
      />
    </template>
  </SheetRenderer>
</template>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { SheetRenderer, useSheet } from '@speed-sheet/vue3'
import type { Sheet, SheetOptions } from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'
import type { SpeedSheetProps } from './types'
import { SheetToolbarMenuBar, CellContextMenu } from './menus'
import { SHEET_TOOLBAR_KEY } from './composables/useSheetToolbarContext'

const props = withDefaults(defineProps<SpeedSheetProps>(), {
  showToolbar: true,
  showSheetTabs: true,
  showFormulaBar: true,
  lang: 'zh',
})

const rendererRef = ref<InstanceType<typeof SheetRenderer> | null>(null)
const viewportEl = computed(() => rendererRef.value?.viewportEl ?? null)

const ui = computed(() => ({
  showToolbar: props.showToolbar ?? true,
  showSheetTabs: props.showSheetTabs ?? true,
  showFormulaBar: props.showFormulaBar ?? true,
  rowHeaderWidth: props.rowHeaderWidth,
  columnHeaderHeight: props.columnHeaderHeight,
}))

const workbookFile = computed(() => props.sheetData ?? props.data)

const sheetOptions = computed<SheetOptions>(() => ({
  data: workbookFile.value,
  snapshot: props.snapshot,
  extensions: props.extensions,
  ydoc: props.ydoc,
  onUpdate: (s: Sheet) => {
    const file = s.toLuckysheetFile()
    if (file) props.onChange?.(file)
  },
}))

const { sheetView, sheet, selection, activeSheetId, sheetNames, allCells, switchSheet } = useSheet(sheetOptions)

const rendererView = computed(() => ({
  ...sheetView.value,
  rowHeaderWidth: props.rowHeaderWidth,
  columnHeaderHeight: props.columnHeaderHeight,
}))

const rendererChrome = computed(() => ({
  showToolbar: ui.value.showToolbar,
  showSheetBar: ui.value.showSheetTabs,
  showFormulaBar: ui.value.showFormulaBar,
  sheetNames: sheetNames.value,
  activeSheetName: activeSheetId.value,
}))

const formatPainterActive = ref(false)
const copiedStyle = ref<Partial<CellAttributes> | null>(null)
const findReplaceOpen = ref(false)

provide(SHEET_TOOLBAR_KEY, {
  sheet,
  selection,
  cells: allCells,
  formatPainterActive,
  copiedStyle,
  findReplaceOpen,
})

function onCellClick(r: number, c: number): void {
  const s = sheet.value
  if (!s) return
  if (formatPainterActive.value && copiedStyle.value) {
    s.chain().applyCellStyle({ r, c, style: copiedStyle.value }).run()
    formatPainterActive.value = false
    copiedStyle.value = null
  }
  s.chain().selectCell({ r, c }).run()
}

function onSelectRange(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  anchorR: number,
  anchorC: number,
): void {
  sheet.value
    ?.chain()
    .selectRange({
      row: [r0, r1],
      column: [c0, c1],
      anchor: { r: anchorR, c: anchorC },
    })
    .run()
}
</script>

<template>
  <div ref="rootEl" class="speed-sheet speed-sheet-root">
    <SheetToolbarHost v-if="ui.showToolbar">
      <SheetToolbarMenuBar :toolbar-keys="props.toolbarKeys" :exclude-keys="props.excludeToolbarKeys" />
    </SheetToolbarHost>
    <SheetFormulaBar
      v-if="ui.showFormulaBar"
      :sheet="sheet"
      :revision="revision"
      :boundary="rootEl"
    />
    <SheetCanvas
      class="speed-sheet-canvas"
      ref="canvasRef"
      :sheet="sheet"
      :revision="revision"
      :row-header-width="ui.rowHeaderWidth"
      :column-header-height="ui.columnHeaderHeight"
      :formula-ref-ranges="formulaRefRanges"
      :formula-pick-mode="formulaPickMode"
      :commit-boundary="rootEl"
      @cell-click="onCellClick"
      @formula-pick="onFormulaPick"
      @formula-range-pick="onFormulaRangePick"
    >
      <template #context-menu="{ r, c, clientX, clientY, target, close }">
        <CellContextMenu
          open
          :r="r"
          :c="c"
          :client-x="clientX"
          :client-y="clientY"
          :target="target"
          :sheet="sheet"
          :lang="props.lang"
          :menu-keys="props.cellContextMenu"
          :exclude-keys="props.excludeContextMenuKeys"
          :boundary="viewportEl"
          @close="close"
        />
      </template>
    </SheetCanvas>
    <SheetTabBar
      v-if="ui.showSheetTabs"
      ref="tabBarRef"
      :sheet="sheet"
      :revision="revision"
      :lang="props.lang"
      :menu-keys="props.sheetTabContextMenu"
      :exclude-menu-keys="props.excludeSheetTabMenuKeys"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import {
  SheetCanvas,
  useSheet,
  provideFormulaEdit,
  useFormulaCanvas,
} from '@speed-sheet/vue3'
import type { Sheet } from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'
import type { SpeedSheetProps } from './types'
import { SheetToolbarMenuBar, CellContextMenu } from './menus'
import SheetFormulaBar from './components/SheetFormulaBar.vue'
import SheetTabBar from './components/SheetTabBar.vue'
import SheetToolbarHost from './components/SheetToolbarHost.vue'
import { SHEET_TOOLBAR_KEY } from './composables/useSheetToolbarContext'
import { useSheetLocale } from './composables/useSheetLocale'

const props = withDefaults(defineProps<SpeedSheetProps>(), {
  showToolbar: true,
  showSheetTabs: true,
  showFormulaBar: true,
  lang: 'zh',
})

useSheetLocale(() => props.lang)

const formulaEdit = provideFormulaEdit()

const rootEl = ref<HTMLElement | null>(null)
const canvasRef = ref<InstanceType<typeof SheetCanvas> | null>(null)
const tabBarRef = ref<InstanceType<typeof SheetTabBar> | null>(null)
const viewportEl = computed(() => canvasRef.value?.viewportEl ?? null)

const ui = computed(() => ({
  showToolbar: props.showToolbar ?? true,
  showSheetTabs: props.showSheetTabs ?? true,
  showFormulaBar: props.showFormulaBar ?? true,
  rowHeaderWidth: props.rowHeaderWidth,
  columnHeaderHeight: props.columnHeaderHeight,
}))

const workbookFile = computed(() => props.sheetData ?? props.data)

const sheetOptions = computed(() => ({
  data: workbookFile.value,
  snapshot: props.snapshot,
  extensions: props.extensions,
  ydoc: props.ydoc,
  onUpdate: (s: Sheet) => {
    const file = s.toLuckysheetFile()
    if (file) props.onChange?.(file)
  },
}))

const { sheet, revision, switchSheet, addSheet } = useSheet(sheetOptions)

const {
  formulaPickMode,
  formulaRefRanges,
  handleFormulaCellClick,
  handleFormulaRangeSelect,
  insertRefAt,
} = useFormulaCanvas(sheet, formulaEdit)

const formatPainterActive = ref(false)
const copiedStyle = ref<Partial<CellAttributes> | null>(null)
const findReplaceOpen = ref(false)

provide(SHEET_TOOLBAR_KEY, {
  sheet,
  revision,
  formatPainterActive,
  copiedStyle,
  findReplaceOpen,
})

function onCellClick(r: number, c: number): void {
  if (handleFormulaCellClick(r, c)) return
  const s = sheet.value
  if (!s) return
  if (formatPainterActive.value && copiedStyle.value) {
    s.chain().applyCellStyle({ r, c, style: copiedStyle.value }).run()
    formatPainterActive.value = false
    copiedStyle.value = null
  }
}

function onFormulaPick(r: number, c: number): void {
  insertRefAt(r, c)
}

function onFormulaRangePick(r0: number, c0: number, r1: number, c1: number): void {
  handleFormulaRangeSelect(r0, c0, r1, c1)
}

defineExpose({
  sheet,
  switchSheet,
  addSheet,
  viewportEl,
  revision,
})
</script>

<style scoped lang="less">
.speed-sheet-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
  font-size: var(--ant-font-size-sm);
  background: var(--ant-color-bg-container);
}

:deep(.speed-sheet-canvas) {
  flex: 1 1 0;
  min-height: 0;
}
</style>

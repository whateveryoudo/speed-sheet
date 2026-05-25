<template>
  <div class="speed-sheet speed-sheet-root">
    <SheetFormulaBar
      v-if="ui.showFormulaBar"
      :sheet="sheet"
      :revision="revision"
    />
    <SheetToolbarHost v-if="ui.showToolbar">
      <SheetToolbarMenuBar
        :toolbar-keys="props.toolbarKeys"
        :exclude-keys="props.excludeToolbarKeys"
      />
    </SheetToolbarHost>
    <SheetCanvas
      class="speed-sheet-canvas"
      ref="canvasRef"
      :sheet="sheet"
      :revision="revision"
      :row-header-width="ui.rowHeaderWidth"
      :column-header-height="ui.columnHeaderHeight"
      @cell-click="onCellClick"
    >
      <template #context-menu="{ r, c, clientX, clientY, close }">
        <CellContextMenu
          open
          :r="r"
          :c="c"
          :client-x="clientX"
          :client-y="clientY"
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
      @tab-menu="onTabMenu"
    >
      <template
        v-if="tabMenuOpen"
        #tab-menu="{ sheetId, clientX, clientY, close }"
      >
        <SheetTabContextMenu
          open
          :sheet-id="sheetId"
          :client-x="clientX"
          :client-y="clientY"
          :sheet="sheet"
          :lang="props.lang"
          :menu-keys="props.sheetTabContextMenu"
          :exclude-keys="props.excludeSheetTabMenuKeys"
          :boundary="tabBarEl"
          @close="onTabMenuClose(close)"
        />
      </template>
    </SheetTabBar>
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { SheetCanvas, useSheet } from '@speed-sheet/vue3'
import type { Sheet, SheetOptions } from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'
import type { SpeedSheetProps } from './types'
import { SheetToolbarMenuBar, CellContextMenu, SheetTabContextMenu } from './menus'
import SheetFormulaBar from './components/SheetFormulaBar.vue'
import SheetTabBar from './components/SheetTabBar.vue'
import SheetToolbarHost from './components/SheetToolbarHost.vue'
import { SHEET_TOOLBAR_KEY } from './composables/useSheetToolbarContext'
import type { SheetTabMenuState } from './menus/sheetTabMenu/types'

const props = withDefaults(defineProps<SpeedSheetProps>(), {
  showToolbar: true,
  showSheetTabs: true,
  showFormulaBar: true,
  lang: 'zh',
})

const canvasRef = ref<InstanceType<typeof SheetCanvas> | null>(null)
const tabBarRef = ref<InstanceType<typeof SheetTabBar> | null>(null)
const viewportEl = computed(() => canvasRef.value?.viewportEl ?? null)
const tabBarEl = computed(() => tabBarRef.value?.rootEl ?? null)

const tabMenuOpen = ref(false)
let tabMenuCloseFn: (() => void) | null = null

function onTabMenu(_payload: SheetTabMenuState & { close: () => void }): void {
  tabMenuOpen.value = true
  tabMenuCloseFn = _payload.close
}

function onTabMenuClose(close: () => void): void {
  close()
  tabMenuOpen.value = false
  tabMenuCloseFn = null
}

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

const { sheet, revision, switchSheet, addSheet } = useSheet(sheetOptions)

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
  const s = sheet.value
  if (!s) return
  if (formatPainterActive.value && copiedStyle.value) {
    s.chain().applyCellStyle({ r, c, style: copiedStyle.value }).run()
    formatPainterActive.value = false
    copiedStyle.value = null
  }
}

defineExpose({
  sheet,
  switchSheet,
  addSheet,
  viewportEl,
  revision,
})
</script>

<style scoped src="./components/sheet-chrome.less"></style>

<template>
  <div
    ref="rootEl"
    class="speed-sheet speed-sheet-root"
    :class="{ 'is-editable': ui.editable }"
  >
    <SheetToolbarHost v-if="ui.showToolbar">
      <SheetToolbarMenuBar :toolbar-keys="props.toolbarKeys" :exclude-keys="props.excludeToolbarKeys" />
    </SheetToolbarHost>
    <SheetFormulaBar
      v-if="ui.showFormulaBar"
      :sheet="sheet"
      :revision="revision"
      :boundary="rootEl"
    />
    <div class="speed-sheet-canvas-wrap">
      <CfRangePickBanner v-if="cfRangePick.active.value" />
      <SheetCanvas
        class="speed-sheet-canvas"
        ref="canvasRef"
        :sheet="sheet"
        :revision="revision"
        :editable="ui.editable"
        :row-header-width="ui.rowHeaderWidth"
        :column-header-height="ui.columnHeaderHeight"
        :formula-ref-ranges="canvasRefRanges"
        :formula-pick-mode="formulaPickMode"
        :commit-boundary="rootEl"
        :resolve-cell-dbl-click="resolveCellDblClick"
        :can-edit-cell="canEditCell"
        @cell-click="onCellClick"
        @formula-pick="onFormulaPick"
        @formula-range-pick="onFormulaRangePick"
        @select-range="onSelectRange"
        @viewport-drop="onViewportDrop"
        @freeze-invalid="onFreezeInvalid"
        @edit-blocked="onEditBlocked"
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
      <ConditionalFormatSidebar :range-pick="cfRangePick" />
    </div>
    <SheetTabBar
      v-if="ui.showSheetTabs"
      ref="tabBarRef"
      :sheet="sheet"
      :revision="revision"
      :editable="ui.editable"
      :lang="props.lang"
      :menu-keys="props.sheetTabContextMenu"
      :exclude-menu-keys="props.excludeSheetTabMenuKeys"
    />
    <ProtectionManageModal />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref, toRef, watch, onMounted, onUnmounted } from 'vue'
import { Modal } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { SheetCanvas, useSheet, useFormulaCanvas } from '@speed-sheet/vue3'
import type { CommandBlockedEvent, Sheet } from '@speed-sheet/core'
import { isCellProtected } from '@speed-sheet/extension-protection'
import { isFormulaText } from '@speed-sheet/extension-formula'
import type { CellAttributes } from '@speed-sheet/shared'
import type { SpeedSheetProps } from './types'
import { SheetToolbarMenuBar, CellContextMenu } from './menus'
import SheetFormulaBar from './components/SheetFormulaBar.vue'
import SheetTabBar from './components/SheetTabBar.vue'
import SheetToolbarHost from './components/SheetToolbarHost.vue'
import { useSheetFileInsert } from '@speed-sheet/vue3'
import { useSheetImageInsert } from './extensions/image'
import { SHEET_TOOLBAR_KEY } from './composables/useSheetToolbarContext'
import { useSheetLocale } from './composables/useSheetLocale'
import { useSpeedSheetProvider } from './composables/useSpeedSheetProvider'
import { provideInsertMenu } from './composables/useInsertMenuContext'
import { provideDropdownConfigPanel } from './composables/useDropdownConfigPanel'
import { provideDropdownPickPanel } from './composables/useDropdownPickPanel'
import { provideLinkConfigPanel } from './composables/useLinkConfigPanel'
import { provideLinkToolbarPanel } from './composables/useLinkToolbarPanel'
import { provideNoteConfigPanel } from './composables/useNoteConfigPanel'
import { provideFilterConfigPanel } from './composables/useFilterConfigPanel'
import { provideProtectionManage } from './composables/useProtectionManage'
import { provideConditionalFormatPanel } from './composables/useConditionalFormatPanel'
import { useCfRangePick } from './composables/useCfRangePick'
import ProtectionManageModal from './components/ProtectionManageModal.vue'
import ConditionalFormatSidebar from './components/ConditionalFormatSidebar.vue'
import CfRangePickBanner from './components/CfRangePickBanner.vue'
import { SheetPreviewImage } from './helpers/sheetPreviewImage'
import { mergeSpeedSheetExtensions } from './composables/sheetBuiltin'
import { noteHasContent } from '@speed-sheet/shared'
import { isFilterHeaderCell } from '@speed-sheet/extension-filter'

const props = withDefaults(defineProps<SpeedSheetProps>(), {
  showToolbar: true,
  showSheetTabs: true,
  showFormulaBar: true,
  lang: 'zh',
  editable: true,
  upload: undefined,
})

useSheetLocale(() => props.lang)

const { formulaEdit, previewInstance } = useSpeedSheetProvider({
  editable: toRef(() => props.editable ?? true),
  upload: toRef(() => props.upload),
})

provideInsertMenu({
  insertMenuKeys: toRef(() => props.insertMenuKeys),
  insertMenuConfig: toRef(() => props.insertMenuConfig),
})

const { openPanel: openDropdownConfig, closePanel: closeDropdownConfig } =
  provideDropdownConfigPanel()
const { togglePick, closePick } = provideDropdownPickPanel()
const { openPanel: openLinkConfig, closePanel: closeLinkConfig } = provideLinkConfigPanel()
const { toggleToolbar: toggleLinkToolbar, closeToolbar: closeLinkToolbar } =
  provideLinkToolbarPanel()
const { openPanel: openNoteConfig, closePanel: closeNoteConfig } = provideNoteConfigPanel()
const { openPanel: openFilterConfig, closePanel: closeFilterConfig } = provideFilterConfigPanel()
const protectionManage = provideProtectionManage()
provideConditionalFormatPanel()

const { t } = useI18n()

function showProtectedEditModal(): void {
  Modal.confirm({
    title: t('protection.blockedTitle'),
    content: t('protection.blockedContent'),
    okText: t('protection.blockedManage'),
    cancelText: t('protection.blockedCancel'),
    onOk: () => {
      protectionManage.openModal()
    },
  })
}

function onCommandBlocked(event: CommandBlockedEvent): void {
  if (event.reason === 'already_protected') {
    Modal.error({
      title: t('protection.alreadyProtectedTitle'),
      content: t('protection.alreadyProtectedContent'),
      okText: t('protection.ok'),
    })
    return
  }
  showProtectedEditModal()
}

function closeSheetBubbles(except?: 'dropdown' | 'link' | 'note' | 'filter'): void {
  if (except !== 'dropdown') {
    closeDropdownConfig()
    cancelPendingDropdownPick()
    closePick()
  }
  if (except !== 'link') {
    closeLinkConfig()
    closeLinkToolbar()
  }
  if (except !== 'note') {
    closeNoteConfig()
  }
  if (except !== 'filter') {
    closeFilterConfig()
  }
}

/** 延迟展开取值层，避免双击时先闪出 pick 再开配置 */
const DROPDOWN_PICK_CLICK_DELAY_MS = 250
let dropdownPickClickTimer: ReturnType<typeof setTimeout> | null = null

function cancelPendingDropdownPick(): void {
  if (dropdownPickClickTimer) {
    clearTimeout(dropdownPickClickTimer)
    dropdownPickClickTimer = null
  }
}

function scheduleDropdownPickToggle(r: number, c: number): void {
  cancelPendingDropdownPick()
  dropdownPickClickTimer = setTimeout(() => {
    dropdownPickClickTimer = null
    togglePick({ r, c })
  }, DROPDOWN_PICK_CLICK_DELAY_MS)
}

const rootEl = ref<HTMLElement | null>(null)
const canvasRef = ref<InstanceType<typeof SheetCanvas> | null>(null)
const tabBarRef = ref<InstanceType<typeof SheetTabBar> | null>(null)
const viewportEl = computed(() => canvasRef.value?.viewportEl ?? null)

const ui = computed(() => {
  const canEdit = props.editable ?? true
  return {
    showToolbar: (props.showToolbar ?? true) && canEdit,
    showSheetTabs: props.showSheetTabs ?? true,
    showFormulaBar: (props.showFormulaBar ?? true) && canEdit,
    rowHeaderWidth: props.rowHeaderWidth,
    columnHeaderHeight: props.columnHeaderHeight,
    editable: canEdit,
  }
})

const luckysheetFile = computed(() => props.luckysheetData ?? props.data)

const sheetOptions = computed(() => ({
  snapshot: props.sheetData,
  data: luckysheetFile.value,
  extensions: mergeSpeedSheetExtensions(props.extensions, props.filterUserId),
  ydoc: props.ydoc,
  onUpdate: (s: Sheet) => {
    if (!(props.editable ?? true)) return
    const snapshot = s.toSnapshot()
    if (snapshot) props.onChange?.(snapshot)
    if (props.onLuckysheetChange) {
      const file = s.toLuckysheetFile()
      if (file) props.onLuckysheetChange(file)
    }
  },
  onBeforeLayoutChange: (s: Sheet) => {
    canvasRef.value?.endEditingForLayoutChange()
    if (formulaEdit.active.value) {
      const { r, c } = formulaEdit.anchor.value
      const val = formulaEdit.text.value
      if (isFormulaText(val)) {
        s.chain().setCellFormula({ r, c, formula: val }).run()
      } else if (val !== '') {
        s.chain().setCellValue({ r, c, value: val }).run()
      }
    }
  },
  onLayoutChange: () => {
    formulaEdit.cancel()
  },
  onCommandBlocked: onCommandBlocked,
}))

const { sheet, revision, switchSheet, addSheet } = useSheet(sheetOptions)
const cfRangePick = useCfRangePick(sheet)

onMounted(() => {
  previewInstance.value = new SheetPreviewImage(() => sheet.value)
})

onUnmounted(() => {
  cancelPendingDropdownPick()
  previewInstance.value?.destroy()
  previewInstance.value = null
})

function getDropAnchor(): { r: number; c: number } {
  const sel = sheet.value?.state.getSelection()
  if (!sel) return { r: 0, c: 0 }
  return {
    r: sel.anchor?.r ?? sel.row[0],
    c: sel.anchor?.c ?? sel.column[0],
  }
}

function getCellSize(r: number, c: number): { w: number; h: number } {
  const s = sheet.value
  if (!s) return { w: 120, h: 25 }
  return {
    w: s.state.getColWidth(c),
    h: s.state.getRowHeight(r),
  }
}

const fileInsert = useSheetFileInsert({
  sheet,
  getAnchor: getDropAnchor,
})

const imageInsert = useSheetImageInsert({
  sheet,
  getAnchor: getDropAnchor,
  getCellSize,
})

async function onViewportDrop(e: DragEvent): Promise<void> {
  if (!(props.editable ?? true)) return
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (!files.length) return
  const images = files.filter((f) => f.type.startsWith('image/'))
  const others = files.filter((f) => !f.type.startsWith('image/'))
  if (images.length) {
    await imageInsert.insertImagesFromFiles(images)
  }
  for (const file of others) {
    await fileInsert.insertAttachmentFromFile(file)
  }
}

const {
  formulaPickMode,
  formulaRefRanges,
  handleFormulaCellClick,
  handleFormulaRangeSelect,
  insertRefAt,
} = useFormulaCanvas(sheet, formulaEdit)

const canvasRefRanges = computed(() => {
  const base = formulaRefRanges.value
  const pick = cfRangePick.overlayRange.value
  if (!pick) return base
  return [
    ...base,
    {
      row: pick.row,
      column: pick.column,
      color: '#1a73e8',
    },
  ]
})

const formatPainterActive = ref(false)
const copiedStyle = ref<Partial<CellAttributes> | null>(null)
const findReplaceOpen = ref(false)

provide(SHEET_TOOLBAR_KEY, {
  sheet,
  revision,
  editable: toRef(() => props.editable ?? true),
  formatPainterActive,
  copiedStyle,
  findReplaceOpen,
  getViewportState: () => canvasRef.value?.getViewportState?.() ?? null,
})

watch(
  () => props.editable,
  (canEdit) => {
    if (canEdit) return
    formatPainterActive.value = false
    copiedStyle.value = null
    findReplaceOpen.value = false
    formulaEdit.cancel()
    canvasRef.value?.endEditingForLayoutChange()
  },
)

function commitFormulaEditIfActive(): void {
  const s = sheet.value
  if (!s || !formulaEdit.active.value) return
  const { r, c } = formulaEdit.anchor.value
  const val = formulaEdit.text.value
  if (isFormulaText(val)) {
    s.chain().setCellFormula({ r, c, formula: val }).run()
  } else if (val !== '') {
    s.chain().setCellValue({ r, c, value: val }).run()
  }
  formulaEdit.cancel()
}

function onCellClick(r: number, c: number): void {
  if (!(props.editable ?? true)) return
  if (cfRangePick.active.value) return
  if (handleFormulaCellClick(r, c)) return
  if (formulaEdit.active.value) {
    commitFormulaEditIfActive()
  }
  const s = sheet.value
  if (!s) return
  if (isFilterHeaderCell(s, r, c)) {
    closeSheetBubbles('filter')
    openFilterConfig({ r, c })
    return
  }
  const rule = s.state.getDataVerification(r, c)
  if (rule?.type === 'dropdown') {
    closeSheetBubbles('dropdown')
    scheduleDropdownPickToggle(r, c)
  } else if (rule?.type === 'link') {
    closeSheetBubbles('link')
    toggleLinkToolbar({ r, c })
  } else if (rule?.type === 'note' && noteHasContent(rule.noteContent)) {
    closeSheetBubbles('note')
  } else {
    closeSheetBubbles()
  }
  if (formatPainterActive.value && copiedStyle.value) {
    s.chain().applyCellStyle({ r, c, style: copiedStyle.value }).run()
    formatPainterActive.value = false
    copiedStyle.value = null
  }
}

/** 双击下拉单元格打开配置面板，不进入内联编辑 */
function resolveCellDblClick(r: number, c: number): boolean {
  if (!(props.editable ?? true)) return false
  const s = sheet.value
  if (!s) return false
  const rule = s.state.getDataVerification(r, c)
  if (rule?.type === 'dropdown') {
    closeSheetBubbles('dropdown')
    openDropdownConfig({ r, c })
    return true
  }
  if (rule?.type === 'link') {
    closeSheetBubbles('link')
    openLinkConfig({ r, c })
    return true
  }
  return false
}

function onFormulaPick(r: number, c: number): void {
  insertRefAt(r, c)
}

function onFormulaRangePick(r0: number, c0: number, r1: number, c1: number): void {
  handleFormulaRangeSelect(r0, c0, r1, c1)
}

function onSelectRange(
  r0: number,
  c0: number,
  r1: number,
  c1: number,
  _anchorR: number,
  _anchorC: number,
): void {
  if (cfRangePick.active.value) {
    cfRangePick.handleSelectRange(r0, c0, r1, c1)
  }
}

function onFreezeInvalid(): void {
  Modal.error({
    title: '操作出错了',
    content: '冻结区域超出当前窗口可视范围，冻结线已取消。建议重新设置。',
    okText: '知道了',
  })
}

function canEditCell(r: number, c: number): boolean {
  const s = sheet.value
  if (!s) return true
  return !isCellProtected(s, r, c)
}

function onEditBlocked(): void {
  showProtectedEditModal()
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
  // font-size: var(--ant-font-size-sm);
  background: var(--ant-color-bg-container);
}

.speed-sheet-canvas-wrap {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  display: flex;
}

:deep(.speed-sheet-canvas) {
  flex: 1 1 0;
  min-height: 0;
}

.speed-sheet-root:not(.is-editable) :deep(.sheet-canvas) {
  cursor: default;
}
</style>

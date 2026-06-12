<template>
  <div
    class="sheet-canvas-root"
    :class="{ 'is-readonly': !editableCpt }"
    ref="rootEl"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <div
      class="sheet-viewport"
      ref="viewportEl"
      @dragover.prevent="onViewportDragOver"
      @drop.prevent="onViewportDrop"
    >
      <div class="sheet-scroll" ref="scrollEl" @scroll="handleScroll">
        <div class="sheet-spacer" :style="{ width: totalW + 'px', height: totalH + 'px' }" aria-hidden="true" />
      </div>
      <div
        v-show="resizeGuide.active"
        class="resize-guide"
        :class="resizeGuide.axis === 'row' ? 'is-row' : 'is-col'"
        :style="resizeGuideStyle"
        aria-hidden="true"
      />
      <div
        v-show="rowMoveGuide.active"
        class="row-move-guide"
        :style="{ top: `${rowMoveGuide.pos}px` }"
        aria-hidden="true"
      />
      <div
        v-show="rowMoveHint.show"
        class="row-move-hint"
        :style="{ left: `${rowMoveHint.x}px`, top: `${rowMoveHint.y}px` }"
      >
        {{ rowMoveHint.text }}
      </div>
      <div
        v-show="colMoveGuide.active"
        class="col-move-guide"
        :style="{ left: `${colMoveGuide.pos}px` }"
        aria-hidden="true"
      />
      <div
        v-show="colMoveHint.show"
        class="row-move-hint"
        :style="{ left: `${colMoveHint.x}px`, top: `${colMoveHint.y}px` }"
      >
        {{ colMoveHint.text }}
      </div>
      <div
        v-if="scrollbar.canScrollX"
        class="sheet-scrollbar-gutter sheet-scrollbar-gutter-x"
        :style="scrollbar.gutterXStyle"
        aria-hidden="true"
        @mouseenter="onGutterXEnter"
        @mouseleave="onGutterXLeave"
      />
      <div
        v-if="scrollbar.canScrollY"
        class="sheet-scrollbar-gutter sheet-scrollbar-gutter-y"
        :style="scrollbar.gutterYStyle"
        aria-hidden="true"
        @mouseenter="onGutterYEnter"
        @mouseleave="onGutterYLeave"
      />
      <div
        v-show="scrollbar.canScrollX"
        class="sheet-scrollbar sheet-scrollbar-x"
        :class="{ 'is-visible': scrollbarVisibleX }"
        :style="scrollbar.trackXStyle"
        @mouseenter="onScrollbarEnter"
        @mouseleave="onScrollbarLeave"
        @mousedown="onTrackClick('x', $event)"
      >
        <div
          class="sheet-scrollbar-thumb"
          :style="scrollbar.thumbXStyle"
          @mousedown.stop="onThumbDragStart('x', $event)"
        />
      </div>
      <div
        v-show="scrollbar.canScrollY"
        class="sheet-scrollbar sheet-scrollbar-y"
        :class="{ 'is-visible': scrollbarVisibleY }"
        :style="scrollbar.trackYStyle"
        @mouseenter="onScrollbarEnter"
        @mouseleave="onScrollbarLeave"
        @mousedown="onTrackClick('y', $event)"
      >
        <div
          class="sheet-scrollbar-thumb"
          :style="scrollbar.thumbYStyle"
          @mousedown.stop="onThumbDragStart('y', $event)"
        />
      </div>
      <SheetExtensionViews :sheet="props.sheet" />
      <SheetBubbleMenusHost :sheet="props.sheet" :boundary="viewportEl" />
      <canvas
        ref="canvasEl"
        class="sheet-canvas"
        @wheel="onCanvasWheel"
        @mousedown="onMouseDown"
        @mousemove="onCanvasMouseMove"
        @mouseleave="onCanvasMouseLeave"
        @dblclick="onDblClick"
        @contextmenu="onContextMenu"
      />
      <div
        v-if="errorTip.show"
        class="formula-error-tip"
        :style="{ left: `${errorTip.x}px`, top: `${errorTip.y}px` }"
      >
        <span class="formula-error-tip-icon">!</span>
        <span>{{ errorTip.message }}</span>
      </div>
      <FormulaRichInput
        v-if="editing"
        ref="editorEl"
        v-model="editorValue"
        class="cell-editor"
        :style="editorStyle"
        :field-style="editorFieldStyle"
        @input="onEditorInput"
        @blur="onEditorBlur"
        @keydown="onEditorKeydown"
        @keyup="syncEditorCaret"
        @click.stop="syncEditorCaret"
        @mousedown.stop
      />
      <slot v-if="ctxMenu.show && $slots['context-menu']" name="context-menu" v-bind="ctxMenuPayload"
        :close="closeCtxMenu" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, inject, watch } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import type { SheetViewportEditorBridge } from '@speed-sheet/view'
import type { ContextMenuState } from '../types/context-menu'
import { FORMULA_EDIT_KEY } from '../composables/useFormulaEdit'
import { useSheetEditorOptional } from '../composables/useSheetEditorContext'
import { useSheetCanvasView } from '../composables/useSheetCanvasView'
import { useSheetInlineEdit, type UseSheetInlineEditReturn } from '../composables/useSheetInlineEdit'
import FormulaRichInput from './FormulaRichInput.vue'
import SheetExtensionViews from './SheetExtensionViews.vue'
import SheetBubbleMenusHost from './SheetBubbleMenusHost.vue'
import { provideSheetViewport } from '../composables/useSheetViewportContext'

const props = withDefaults(defineProps<{
  sheet: Sheet | null
  revision?: number
  rowHeaderWidth?: number
  columnHeaderHeight?: number
  formulaRefRanges?: Array<{
    row: [number, number]
    column: [number, number]
    color: string
  }>
  formulaPickMode?: boolean
  commitBoundary?: HTMLElement | null
  editable?: boolean
  resolveCellDblClick?: (r: number, c: number) => boolean | void
  canEditCell?: (r: number, c: number) => boolean
}>(), {
  revision: 0,
  formulaRefRanges: () => [],
  formulaPickMode: false,
  commitBoundary: null,
  editable: true,
})

const sheet = computed(() => props.sheet)
const revision = computed(() => props.revision)
const formulaEdit = inject(FORMULA_EDIT_KEY, null)
const sheetEditor = useSheetEditorOptional()
const editableCpt = computed(
  () => props.editable && (sheetEditor?.editableCpt.value ?? true),
)

const emit = defineEmits<{
  'cell-click': [r: number, c: number]
  'formula-pick': [r: number, c: number]
  'formula-range-pick': [r0: number, c0: number, r1: number, c1: number]
  'select-range': [r0: number, c0: number, r1: number, c1: number, anchorR: number, anchorC: number]
  'context-menu': [payload: ContextMenuState & { close: () => void }]
  'viewport-mousedown': [e: MouseEvent]
  'viewport-drop': [e: DragEvent]
  'freeze-invalid': []
  'edit-blocked': []
}>()

const rootEl = ref<HTMLElement>()
const viewportEl = ref<HTMLElement>()
const scrollEl = ref<HTMLElement>()
const canvasEl = ref<HTMLCanvasElement>()
const editorEl = ref<InstanceType<typeof FormulaRichInput> | null>(null)

const viewportTick = ref(0)
function bumpViewportTick(): void {
  viewportTick.value++
}

/** inlineEdit 在 canvasView 之后创建；bridge 方法仅在用户交互时调用，需可选守卫 */
let inlineEdit: UseSheetInlineEditReturn | undefined
const editorBridge: SheetViewportEditorBridge = {
  isEditingCell: (r, c) => inlineEdit?.isEditingCell(r, c) ?? false,
  startFormulaPick: (r, c) => inlineEdit?.startFormulaPick(r, c),
  isFormulaPickDragging: () => inlineEdit?.isFormulaPickDragging() ?? false,
  updateFormulaPick: (pt) => inlineEdit?.updateFormulaPick(pt),
  endFormulaPick: (onPick, onRange) => inlineEdit?.endFormulaPick(onPick, onRange),
  isEditing: () => inlineEdit?.editing.value ?? false,
  getEditR: () => inlineEdit?.editR.value ?? 0,
  getEditC: () => inlineEdit?.editC.value ?? 0,
  commitEdit: () => inlineEdit?.commitEdit(),
  openEditor: (r, c, initial) => inlineEdit?.openEditor(r, c, initial),
  cellEditInitial: (r, c) => inlineEdit?.cellEditInitial(r, c) ?? '',
}

const {
  scrollX,
  scrollY,
  layout,
  gridMetrics,
  totalRows,
  totalCols,
  totalW,
  totalH,
  layoutForHit,
  cellEntries,
  cells,
  resizeGuide,
  resizeGuideStyle,
  rowMoveGuide,
  rowMoveHint,
  colMoveGuide,
  colMoveHint,
  errorTip,
  ctxMenu,
  ctxMenuPayload,
  scrollbar,
  scrollbarVisibleX,
  scrollbarVisibleY,
  scheduleDraw,
  closeCtxMenu,
  handleScroll,
  onCanvasWheel,
  onThumbDragStart,
  onTrackClick,
  onGutterXEnter,
  onGutterXLeave,
  onGutterYEnter,
  onGutterYLeave,
  onScrollbarEnter,
  onScrollbarLeave,
  onKeyDown,
  onCanvasMouseLeave,
  onCanvasMouseMove,
  onPointerMouseDown,
  onDblClick,
  onContextMenu,
} = useSheetCanvasView({
  rootEl,
  canvasEl,
  viewportEl,
  scrollEl,
  sheet,
  revision,
  rowHeaderWidth: computed(() => props.rowHeaderWidth),
  columnHeaderHeight: computed(() => props.columnHeaderHeight),
  formulaRefRanges: computed(() => props.formulaRefRanges),
  editable: editableCpt,
  isFormulaPickMode: computed(() => inlineEdit?.effectiveFormulaPick.value ?? props.formulaPickMode),
  isEditing: () => inlineEdit?.editing.value ?? false,
  editor: editorBridge,
  onSelectRange: (r0, c0, r1, c1, anchorR, anchorC) =>
    emit('select-range', r0, c0, r1, c1, anchorR, anchorC),
  onCellClick: (r, c) => emit('cell-click', r, c),
  onCellDblClick: (r, c) => !!props.resolveCellDblClick?.(r, c),
  onContextMenu: (payload) => emit('context-menu', payload),
  onFormulaPick: (r, c) => emit('formula-pick', r, c),
  onFormulaRangePick: (r0, c0, r1, c1) => emit('formula-range-pick', r0, c0, r1, c1),
  onScrollLayout: bumpViewportTick,
  onFreezeInvalid: () => emit('freeze-invalid'),
  onEditorWidthSync: () => {
    if (inlineEdit?.editing.value) inlineEdit.updateEditorWidth()
  },
})

inlineEdit = useSheetInlineEdit({
  sheet,
  formulaEdit,
  editorEl,
  viewportEl,
  rootEl,
  layout,
  scrollX,
  scrollY,
  cellEntries,
  cells,
  commitBoundary: computed(() => props.commitBoundary),
  formulaPickModeProp: toRef(props, 'formulaPickMode'),
  onDraw: scheduleDraw,
  canEditCell: (r, c) => props.canEditCell?.(r, c) ?? true,
  onEditBlocked: () => emit('edit-blocked'),
})

const {
  editing,
  editorValue,
  editorStyle,
  editorFieldStyle,
  endEditingForLayoutChange,
  syncEditorCaret,
  onEditorKeydown,
  onEditorInput,
  onEditorBlur,
  cancelEdit,
} = inlineEdit

provideSheetViewport({
  sheet,
  revision,
  layout,
  scrollX,
  scrollY,
  viewportTick,
  editable: editableCpt,
})

watch([scrollX, scrollY, revision, layout], bumpViewportTick, { deep: true })

function onViewportDragOver(e: DragEvent): void {
  if (!editableCpt.value) return
  if (e.dataTransfer?.types.includes('Files')) {
    e.dataTransfer.dropEffect = 'copy'
  }
}

async function onViewportDrop(e: DragEvent): Promise<void> {
  if (!editableCpt.value) return
  const files = Array.from(e.dataTransfer?.files ?? [])
  if (!files.length) return
  emit('viewport-drop', e)
}

function onMouseDown(e: MouseEvent): void {
  props.sheet?.extensions.forEach((ext) => ext.handleViewportMouseDown(e))
  emit('viewport-mousedown', e)
  onPointerMouseDown(e)
}

watch(editableCpt, (canEdit) => {
  if (canEdit) return
  cancelEdit()
  closeCtxMenu()
})

defineExpose({
  viewportEl,
  sheet,
  getSelection: () => sheet.value?.state.getSelection(),
  chain: () => sheet.value?.chain(),
  endEditingForLayoutChange,
  getViewportState: () => ({
    layout: layoutForHit(),
    scrollX: scrollX.value,
    scrollY: scrollY.value,
    gridMetrics: gridMetrics.value,
  }),
})
</script>

<style scoped>
.sheet-canvas-root.is-readonly {
  cursor: default;
}

.sheet-canvas-root {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  width: 100%;
  outline: none;
  display: flex;
  flex-direction: column;
}

.sheet-viewport {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  position: relative;
  overflow: hidden;
  background: #fff;
  contain: strict;
}

.sheet-scroll {
  position: absolute;
  inset: 0;
  overflow: hidden;
  scrollbar-width: none;
}

.sheet-scroll::-webkit-scrollbar {
  display: none;
}

.sheet-spacer {
  pointer-events: none;
}

.sheet-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: cell;
  z-index: 1;
  pointer-events: auto;
  user-select: none;
}

.sheet-scrollbar-gutter {
  position: absolute;
  z-index: 3;
  pointer-events: auto;
  background: transparent;
}

.sheet-scrollbar {
  position: absolute;
  z-index: 4;
  box-sizing: border-box;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.28s ease;
}

.sheet-scrollbar.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.sheet-scrollbar-x {
  background: rgba(245, 245, 245, 0.92);
}

.sheet-scrollbar-y {
  background: rgba(245, 245, 245, 0.92);
}

.sheet-scrollbar-thumb {
  position: absolute;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 6px;
  cursor: default;
  transition: background 0.15s ease;
}

.sheet-scrollbar.is-visible .sheet-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.35);
}

.resize-guide {
  position: absolute;
  z-index: 12;
  pointer-events: none;
  background: #1a73e8;
  box-shadow: 0 0 0 0.5px rgba(26, 115, 232, 0.35);
}

.resize-guide.is-row {
  cursor: row-resize;
}

.resize-guide.is-col {
  cursor: col-resize;
}

.row-move-guide {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  margin-top: -1px;
  z-index: 14;
  pointer-events: none;
  background: #5f6368;
  box-shadow: 0 0 0 0.5px rgba(95, 99, 104, 0.3);
}

.col-move-guide {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  z-index: 14;
  pointer-events: none;
  background: #5f6368;
  box-shadow: 0 0 0 0.5px rgba(95, 99, 104, 0.3);
}

.row-move-hint {
  position: absolute;
  z-index: 16;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.3;
  color: #333;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  white-space: nowrap;
}

.formula-error-tip {
  position: absolute;
  z-index: 20;
  max-width: 280px;
  padding: 6px 10px;
  font-size: 12px;
  line-height: 1.4;
  color: #333;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.formula-error-tip-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #e74c3c;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.cell-editor) {
  position: absolute;
  z-index: 10;
  border: 2px solid #1a73e8;
  margin: 0;
  font-size: 11px;
  line-height: calc(1em + 2px);
  font-family: ui-monospace, SFMono-Regular, Menlo, -apple-system, sans-serif;
  background: #fff;
  box-sizing: border-box;
  overflow: hidden;
}
</style>

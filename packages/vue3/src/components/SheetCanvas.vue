<template>
  <div class="sheet-canvas-root" ref="rootEl" tabindex="0" @keydown="onKeyDown">
    <div class="sheet-viewport" ref="viewportEl">
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
import { ref, computed, onUnmounted, toRef, inject, watch, nextTick } from 'vue'
import { MergeContext, type Sheet } from '@speed-sheet/core'
import type { ContextMenuState } from '../types/context-menu'
import { FORMULA_EDIT_KEY } from '../composables/useFormulaEdit'
import { useSheetLayout } from '../composables/useSheetLayout'
import { useSheetCanvasData } from '../composables/useSheetCanvasData'
import { useSheetResizeDrag } from '../composables/useSheetResizeDrag'
import { useSheetRowMove } from '../composables/useSheetRowMove'
import { useSheetColMove } from '../composables/useSheetColMove'
import { useSheetSelectionDrag } from '../composables/useSheetSelectionDrag'
import { useSheetContextMenu } from '../composables/useSheetContextMenu'
import { useSheetInlineEdit } from '../composables/useSheetInlineEdit'
import { useSheetDocumentDrag } from '../composables/useSheetDocumentDrag'
import { useSheetCellErrorTip } from '../composables/useSheetCellErrorTip'
import { useSheetCanvasDraw } from '../composables/useSheetCanvasDraw'
import { useSheetKeyboard } from '../composables/useSheetKeyboard'
import { useSheetCanvasPointer } from '../composables/useSheetCanvasPointer'
import { useSheetCanvasScroll } from '../composables/useSheetCanvasScroll'
import FormulaRichInput from './FormulaRichInput.vue'

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
}>(), {
  revision: 0,
  formulaRefRanges: () => [],
  formulaPickMode: false,
  commitBoundary: null,
})

const sheet = computed(() => props.sheet)
const revision = computed(() => props.revision)
const formulaEdit = inject(FORMULA_EDIT_KEY, null)

const emit = defineEmits<{
  'cell-click': [r: number, c: number]
  'formula-pick': [r: number, c: number]
  'formula-range-pick': [r0: number, c0: number, r1: number, c1: number]
  'select-range': [r0: number, c0: number, r1: number, c1: number, anchorR: number, anchorC: number]
  'context-menu': [payload: ContextMenuState & { close: () => void }]
}>()

const rootEl = ref<HTMLElement>()
const viewportEl = ref<HTMLElement>()
const scrollEl = ref<HTMLElement>()
const canvasEl = ref<HTMLCanvasElement>()
const editorEl = ref<InstanceType<typeof FormulaRichInput> | null>(null)

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
} = useSheetLayout({
  sheet,
  revision,
  rowHeaderWidth: computed(() => props.rowHeaderWidth),
  columnHeaderHeight: computed(() => props.columnHeaderHeight),
})

let scheduleDrawRef: () => void = () => {}

const { sel, cells, activeCell, cellEntries, applySelectRange } = useSheetCanvasData({
  sheet,
  revision,
  onSelectRange: (r0, c0, r1, c1, anchorR, anchorC) =>
    emit('select-range', r0, c0, r1, c1, anchorR, anchorC),
})

const inlineEdit = useSheetInlineEdit({
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
  onDraw: () => scheduleDrawRef(),
})

const {
  editing,
  editorValue,
  editorStyle,
  editorFieldStyle,
  effectiveFormulaPick,
  openEditor,
  commitEdit,
  cellEditInitial,
  endEditingForLayoutChange,
  syncEditorCaret,
  onEditorKeydown,
  onEditorInput,
  onEditorBlur,
} = inlineEdit

const selectionDrag = useSheetSelectionDrag({
  canvasEl,
  getLayout: layoutForHit,
  getMetrics: gridMetrics,
  getMergeContext: () => sheet.value?.createMergeContext() ?? MergeContext.empty(),
  onSelectRange: applySelectRange,
})

const {
  resizeGuide,
  resizeGuideStyle,
  isActive: resizeInteractionActive,
  start: startResizeDrag,
  dispose: disposeResizeDrag,
} = useSheetResizeDrag({
  canvasEl,
  getLayout: layoutForHit,
  getMetrics: gridMetrics,
  sheet,
  onDraw: () => scheduleDrawRef(),
})

const {
  rowMoveGuide,
  rowMoveHint,
  isActive: rowMoveInteractionActive,
  start: startRowMoveDrag,
  dispose: disposeRowMoveDrag,
} = useSheetRowMove({
  canvasEl,
  viewportEl,
  getLayout: layoutForHit,
  getMetrics: gridMetrics,
  sheet,
  onDraw: () => scheduleDrawRef(),
})

const {
  colMoveGuide,
  colMoveHint,
  isActive: colMoveInteractionActive,
  start: startColMoveDrag,
  dispose: disposeColMoveDrag,
} = useSheetColMove({
  canvasEl,
  viewportEl,
  getLayout: layoutForHit,
  getMetrics: gridMetrics,
  sheet,
  onDraw: () => scheduleDrawRef(),
})

const isPointerBlocked = () =>
  resizeInteractionActive() || rowMoveInteractionActive() || colMoveInteractionActive()

const documentDrag = useSheetDocumentDrag({
  selectionDrag,
  inlineEdit,
  isBlocked: isPointerBlocked,
  onDraw: () => scheduleDrawRef(),
  onFormulaPick: (r, c) => emit('formula-pick', r, c),
  onFormulaRangePick: (r0, c0, r1, c1) => emit('formula-range-pick', r0, c0, r1, c1),
})

const { endDragSelect, attachPointerListeners, dispose: disposeDocumentDrag } = documentDrag

const {
  ctxMenu,
  ctxMenuPayload,
  closeCtxMenu,
  onContextMenu,
} = useSheetContextMenu({
  canvasEl,
  getLayout: layoutForHit,
  getMetrics: gridMetrics,
  getSelection: () => sel.value,
  sheet,
  onCellClick: (r, c) => emit('cell-click', r, c),
  onDraw: () => scheduleDrawRef(),
  onContextMenu: (payload) => emit('context-menu', payload),
  endDragSelect,
})

const { errorTip, hideErrorTip, updateFromMouseEvent: updateErrorTipFromEvent } =
  useSheetCellErrorTip({
    viewportEl,
    cells,
    cellPointFromEvent: (e) => selectionDrag.cellPointFromEvent(e),
  })

const { scheduleDraw, onScroll } = useSheetCanvasDraw({
  canvasEl,
  viewportEl,
  scrollEl,
  sheet,
  layout,
  scrollX,
  scrollY,
  gridMetrics,
  cellEntries,
  selection: sel,
  isSelecting: () => selectionDrag.isActive(),
  editing,
  editR: inlineEdit.editR,
  editC: inlineEdit.editC,
  formulaRefRanges: computed(() => props.formulaRefRanges),
  revision,
  rowHeaderWidth: computed(() => props.rowHeaderWidth),
  columnHeaderHeight: computed(() => props.columnHeaderHeight),
  onScrollLayout: () => {
    if (editing.value) inlineEdit.updateEditorWidth()
    closeCtxMenu()
  },
})

scheduleDrawRef = scheduleDraw

const {
  scrollbar,
  scrollbarVisibleX,
  scrollbarVisibleY,
  onCanvasWheel,
  handleScroll,
  onThumbDragStart,
  onTrackClick,
  syncScrollMetrics,
  onGutterXEnter,
  onGutterXLeave,
  onGutterYEnter,
  onGutterYLeave,
  onScrollbarEnter,
  onScrollbarLeave,
} = useSheetCanvasScroll({
  scrollEl,
  viewportEl,
  rowHeaderWidth: computed(() => props.rowHeaderWidth ?? layout.value.rowHeaderWidth),
  columnHeaderHeight: computed(() => props.columnHeaderHeight ?? layout.value.columnHeaderHeight),
  onScroll,
})

watch([totalW, totalH], () => nextTick(syncScrollMetrics))

const { onKeyDown } = useSheetKeyboard({
  sheet,
  editing,
  activeCell,
  totalRows,
  totalCols,
  openEditor,
  cellEditInitial,
  applySelectRange,
  onCellClick: (r, c) => emit('cell-click', r, c),
  onDraw: scheduleDraw,
})

const { onCanvasMouseLeave, onCanvasMouseMove, onMouseDown, onDblClick } =
  useSheetCanvasPointer({
    rootEl,
    canvasEl,
    getLayout: layoutForHit,
    gridMetrics,
    isPointerBlocked,
    selectionDrag,
    inlineEdit,
    effectiveFormulaPick,
    editing,
    startResizeDrag,
    startRowMoveDrag,
    startColMoveDrag,
    rowMoveDragging: rowMoveInteractionActive,
    colMoveDragging: colMoveInteractionActive,
    attachPointerListeners,
    endDragSelect,
    closeCtxMenu,
    commitEdit,
    applySelectRange,
    openEditor,
    cellEditInitial,
    onCellClick: (r, c) => emit('cell-click', r, c),
    scheduleDraw,
    hideErrorTip,
    updateErrorTipFromEvent,
    getMergeContext: () => sheet.value?.createMergeContext() ?? MergeContext.empty(),
  })

onUnmounted(() => {
  endDragSelect()
  disposeDocumentDrag()
  disposeResizeDrag()
  disposeRowMoveDrag()
  disposeColMoveDrag()
})

defineExpose({
  viewportEl,
  sheet,
  getSelection: () => sheet.value?.state.getSelection(),
  chain: () => sheet.value?.chain(),
  endEditingForLayoutChange,
})
</script>

<style scoped>
.sheet-canvas-root {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  width: 100%;
  font-size: 11px;
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

/* 底/右缘热区：隐藏时也接收悬停，用于唤出对应滚动条 */
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

<template>
  <div class="sheet-canvas-root" ref="rootEl" tabindex="0" @keydown="onKeyDown">
    <div class="sheet-viewport" ref="viewportEl">
      <div class="sheet-scroll" ref="scrollEl" @scroll="onScroll">
        <div class="sheet-spacer" :style="{ width: totalW + 'px', height: totalH + 'px' }" aria-hidden="true" />
      </div>
      <canvas
        ref="canvasEl"
        class="sheet-canvas"
        @mousedown="onMouseDown"
        @mousemove="onCanvasMouseMove"
        @mouseleave="hideErrorTip"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick, inject } from 'vue'
import { renderSheet, cellFromPoint, cellRect, defaultLayout, CELL_EDITOR_OUTSET, buildCellMap, getCellTextColSpan, computeEditorWidth, type GridLayout, type CellEntry } from '@speed-sheet/core'
import type { Selection, CellAttributes } from '@speed-sheet/shared'
import type { Sheet } from '@speed-sheet/core'
import type { ContextMenuState } from '../types/context-menu'
import { FORMULA_EDIT_KEY } from '../composables/useFormulaEdit'
import {
  buildSheetRefToken,
  getCellFormulaInitial,
  isFormulaText,
  patchFormulaWithRef,
} from '@speed-sheet/extension-formula'
import FormulaRichInput from './FormulaRichInput.vue'

const props = withDefaults(defineProps<{
  sheet: Sheet | null
  /** 与 useSheet.revision 联动，触发 canvas 重绘 */
  revision?: number
  rowHeaderWidth?: number
  columnHeaderHeight?: number
  /** 公式编辑时引用的单元格范围（虚线框） */
  formulaRefRanges?: Array<{
    row: [number, number]
    column: [number, number]
    color: string
  }>
  /** 公式栏选点模式：点击格子插入引用 */
  formulaPickMode?: boolean
  /** 焦点移入该区域时不提交单元格编辑（如工具栏、公式栏） */
  commitBoundary?: HTMLElement | null
}>(), {
  revision: 0,
  formulaRefRanges: () => [],
  formulaPickMode: false,
  commitBoundary: null,
})

const sheet = computed(() => props.sheet)

const EMPTY_SEL: Selection = { row: [0, 0], column: [0, 0] }

const emit = defineEmits<{
  'cell-click': [r: number, c: number]
  'formula-pick': [r: number, c: number]
  'formula-range-pick': [r0: number, c0: number, r1: number, c1: number]
  'select-range': [r0: number, c0: number, r1: number, c1: number, anchorR: number, anchorC: number]
  'context-menu': [payload: ContextMenuState & { close: () => void }]
}>()

const formulaEdit = inject(FORMULA_EDIT_KEY, null)

const rootEl = ref<HTMLElement>()
const viewportEl = ref<HTMLElement>()
const scrollEl = ref<HTMLElement>()
const canvasEl = ref<HTMLCanvasElement>()
const editorEl = ref<InstanceType<typeof FormulaRichInput> | null>(null)

// Grid — 与 defaultLayout / canvas 渲染共用同一套尺寸
const totalRows = 200
const totalCols = 30
const scrollX = ref(0)
const scrollY = ref(0)
const layout = ref<GridLayout>(
  defaultLayout({
    totalRows,
    totalCols,
    ...(props.rowHeaderWidth != null ? { rowHeaderWidth: props.rowHeaderWidth } : {}),
    ...(props.columnHeaderHeight != null ? { columnHeaderHeight: props.columnHeaderHeight } : {}),
  }),
)

const grid = computed(() => ({
  rhw: layout.value.rowHeaderWidth,
  chh: layout.value.columnHeaderHeight,
  cw: layout.value.defaultColWidth,
  rh: layout.value.defaultRowHeight,
}))
const totalW = computed(() => grid.value.rhw + totalCols * grid.value.cw)
const totalH = computed(() => grid.value.chh + totalRows * grid.value.rh)

function editorBox(): {
  left: number
  top: number
  minW: number
  minH: number
} {
  const r = cellRect(editR.value, editC.value, layout.value)
  const o = CELL_EDITOR_OUTSET
  return {
    left: r.x - scrollX.value - o,
    top: r.y - scrollY.value - o,
    minW: r.w + o * 2,
    minH: r.h + o * 2,
  }
}

/** sheet 非响应式，须依赖 revision 才能在选区/单元格变更后重算 */
const sel = computed(() => {
  void props.revision
  return sheet.value?.state.getSelection() ?? EMPTY_SEL
})
const cells = computed(() => {
  void props.revision
  return sheet.value?.state.getAllCells() ?? []
})
const activeCell = computed(() => ({
  r: sel.value.anchor?.r ?? sel.value.row[0],
  c: sel.value.anchor?.c ?? sel.value.column[0],
}))
const cellEntries = computed<CellEntry[]>(() =>
  cells.value.map((c) => ({ r: c.r, c: c.c, data: c.data } as CellEntry)),
)

// ---- Inline edit ----
const editing = ref(false)
const editorValue = ref('')
const editR = ref(0)
const editC = ref(0)
const editorWidthPx = ref(0)
const formulaDragAnchor = ref<{ r: number; c: number } | null>(null)
let skipEditorBlurCommit = false
let formulaDragMoved = false
let deferredBlurCommitTimer: ReturnType<typeof setTimeout> | null = null

function clearDeferredBlurCommit(): void {
  if (deferredBlurCommitTimer !== null) {
    clearTimeout(deferredBlurCommitTimer)
    deferredBlurCommitTimer = null
  }
}

const errorTip = ref({ show: false, x: 0, y: 0, message: '' })

function hideErrorTip(): void {
  errorTip.value.show = false
}

function onCanvasMouseMove(e: MouseEvent): void {
  const pt = cellPointFromEvent(e)
  if (!pt) {
    hideErrorTip()
    return
  }
  const cell = cells.value.find((x) => x.r === pt.r && x.c === pt.c)
  const msg = cell?.data?.em
  if (!cell?.data?.ef || !msg) {
    hideErrorTip()
    return
  }
  const canvas = canvasEl.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const viewport = viewportEl.value
  if (!viewport) return
  const vpRect = viewport.getBoundingClientRect()
  errorTip.value = {
    show: true,
    x: e.clientX - vpRect.left + 8,
    y: e.clientY - vpRect.top - 36,
    message: msg,
  }
}

const effectiveFormulaPick = computed(
  () =>
    props.formulaPickMode ||
    (editing.value && isFormulaText(editorValue.value)),
)

let measureCanvas: HTMLCanvasElement | null = null
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  return measureCanvas.getContext('2d')!
}

function updateEditorWidth(): void {
  if (!editing.value) return
  const ctx = getMeasureCtx()
  const cell = cells.value.find(x => x.r === editR.value && x.c === editC.value)
  const data: CellAttributes = cell?.data ?? { v: editorValue.value }
  const cellMap = buildCellMap(cellEntries.value)
  const colSpan = getCellTextColSpan(
    cellMap,
    editR.value,
    editC.value,
    data,
    layout.value,
    ctx,
    editorValue.value,
  )
  const { left } = editorBox()
  editorWidthPx.value = computeEditorWidth(
    ctx,
    editorValue.value,
    cell?.data,
    colSpan,
    layout.value,
    left,
  )
}

const editorStyle = computed(() => {
  const { left, top, minW, minH } = editorBox()
  const maxW = Math.max(minW, layout.value.viewportW - left - 4)
  const width = Math.min(maxW, Math.max(minW, editorWidthPx.value || minW))
  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    minWidth: `${minW}px`,
    maxWidth: `${maxW}px`,
    height: `${minH}px`,
  }
})

const editorFieldStyle = computed(() => ({
  width: '100%',
  minWidth: editorStyle.value.minWidth,
  maxWidth: editorStyle.value.maxWidth,
}))

// ---- Mouse events (on canvas) ----
const dragAnchor = ref<{ r: number; c: number } | null>(null)

function clampCell(r: number, c: number): { r: number; c: number } {
  return {
    r: Math.max(0, Math.min(totalRows - 1, r)),
    c: Math.max(0, Math.min(totalCols - 1, c)),
  }
}

function cellPointFromEvent(e: MouseEvent): { r: number; c: number } | null {
  const canvas = canvasEl.value
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const { rhw, chh } = grid.value
  if (x < rhw || y < chh) return null
  const pt = cellFromPoint(e.clientX, e.clientY, rect, layout.value)
  if (pt.r < 0 || pt.c < 0) return null
  return clampCell(pt.r, pt.c)
}

function applySelectRange(r0: number, c0: number, r1: number, c1: number): void {
  const a = dragAnchor.value ?? { r: r0, c: c0 }
  sheet.value
    ?.chain()
    .selectRange({
      row: [r0, r1],
      column: [c0, c1],
      anchor: { r: a.r, c: a.c },
    })
    .run()
  emit('select-range', r0, c0, r1, c1, a.r, a.c)
}

function syncFormulaEditFromEditor(): void {
  if (syncingFromFormulaEdit || !editing.value) return
  const val = editorValue.value
  if (!isFormulaText(val)) {
    if (
      formulaEdit?.active.value &&
      formulaEdit.anchor.value.r === editR.value &&
      formulaEdit.anchor.value.c === editC.value
    ) {
      formulaEdit.cancel()
    }
    return
  }
  const caret = editorEl.value?.selectionStart ?? val.length
  if (!formulaEdit) return
  syncingToFormulaEdit = true
  if (!formulaEdit.active.value) {
    formulaEdit.start(editR.value, editC.value, val)
    formulaEdit.caret.value = caret
  } else {
    formulaEdit.setText(val, caret)
  }
  syncingToFormulaEdit = false
  formulaEdit.syncHighlights(sheet.value)
}

/** 公式栏/菜单等外部改动 → 同步到单元格内联编辑器 */
let syncingFromFormulaEdit = false
let syncingToFormulaEdit = false

function syncFromFormulaEdit(): void {
  if (!formulaEdit?.active.value) return
  const { r, c } = formulaEdit.anchor.value
  const text = formulaEdit.text.value
  const caretPos = formulaEdit.caret.value

  const needOpen = !editing.value || editR.value !== r || editC.value !== c
  if (needOpen) {
    editR.value = r
    editC.value = c
    editorValue.value = text
    editing.value = true
  } else if (editorValue.value !== text) {
    editorValue.value = text
  }

  nextTick(() => {
    updateEditorWidth()
    editorEl.value?.focus()
    editorEl.value?.setSelectionRange(caretPos, caretPos)
  })
  formulaEdit.syncHighlights(sheet.value)
  restoreFormulaEditingSelection()
  scheduleDraw()
}

watch(
  () =>
    [
      formulaEdit?.active.value,
      formulaEdit?.text.value,
      formulaEdit?.anchor.value.r,
      formulaEdit?.anchor.value.c,
    ] as const,
  () => {
    if (syncingToFormulaEdit || !formulaEdit?.active.value) return
    syncingFromFormulaEdit = true
    syncFromFormulaEdit()
    syncingFromFormulaEdit = false
  },
)

/** 首次输入 = 后点选单元格前，保证 formulaEdit 与 editorValue 已同步 */
function ensureFormulaEditSynced(): void {
  if (!editing.value || !isFormulaText(editorValue.value)) return
  syncFormulaEditFromEditor()
}

function insertRefIntoEditor(r: number, c: number, r1?: number, c1?: number): void {
  const s = sheet.value
  if (!s) return
  ensureFormulaEditSynced()

  if (formulaEdit?.active.value) {
    formulaEdit.insertRef(s, r, c, r1, c1)
    editorValue.value = formulaEdit.text.value
    const caret = formulaEdit.caret.value
    nextTick(() => {
      editorEl.value?.focus()
      editorEl.value?.setSelectionRange(caret, caret)
      updateEditorWidth()
    })
    formulaEdit.syncHighlights(s)
    restoreFormulaEditingSelection()
    scheduleDraw()
    return
  }

  const token = buildSheetRefToken(s, r, c, r1, c1)
  const caret = editorEl.value?.selectionStart ?? editorValue.value.length
  const { text, caret: nextCaret } = patchFormulaWithRef(editorValue.value, caret, token)
  editorValue.value = text
  nextTick(() => {
    editorEl.value?.focus()
    editorEl.value?.setSelectionRange(nextCaret, nextCaret)
    updateEditorWidth()
  })
  syncFormulaEditFromEditor()
  restoreFormulaEditingSelection()
  scheduleDraw()
}

function openEditor(r: number, c: number, initial = ''): void {
  editR.value = r
  editC.value = c
  editorValue.value = initial
  editing.value = true
  if (isFormulaText(initial) && formulaEdit) {
    formulaEdit.start(r, c, initial)
  }
  nextTick(() => {
    updateEditorWidth()
    const el = editorEl.value
    if (!el) return
    el.focus()
    if (initial.length > 0) {
      el.setSelectionRange(initial.length, initial.length)
    }
  })
}

function restoreFormulaEditingSelection(): void {
  const anchor = formulaEdit?.active.value
    ? formulaEdit.anchor.value
    : editing.value
      ? { r: editR.value, c: editC.value }
      : null
  if (!anchor || !sheet.value) return
  sheet.value
    .chain()
    .selectRange({
      row: [anchor.r, anchor.r],
      column: [anchor.c, anchor.c],
      anchor: { r: anchor.r, c: anchor.c },
    })
    .run()
}

function syncEditorCaret(): void {
  if (!editing.value || !formulaEdit?.active.value) return
  const caret = editorEl.value?.selectionStart ?? editorValue.value.length
  formulaEdit.caret.value = caret
}

function onEditorKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault()
    e.stopPropagation()
    syncEditorCaret()
    commitEdit()
    rootEl.value?.focus()
    return
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    cancelEdit()
    rootEl.value?.focus()
  }
}

function onEditorInput(): void {
  updateEditorWidth()
  syncFormulaEditFromEditor()
  scheduleDraw()
}

function onEditorBlur(e: FocusEvent): void {
  if (skipEditorBlurCommit) {
    skipEditorBlurCommit = false
    return
  }
  const rel = e.relatedTarget as Node | null
  if (rel && viewportEl.value?.contains(rel)) {
    nextTick(() => editorEl.value?.focus())
    return
  }
  // 焦点移到工具栏/公式栏时不提交，避免选函数菜单时闪错
  if (rel && props.commitBoundary?.contains(rel)) return
  // 点画布时 blur 可能先于 mousedown，公式模式延迟提交以便插入引用
  if (isFormulaText(editorValue.value)) {
    clearDeferredBlurCommit()
    deferredBlurCommitTimer = setTimeout(() => {
      deferredBlurCommitTimer = null
      if (skipEditorBlurCommit) {
        skipEditorBlurCommit = false
        return
      }
      if (editing.value) commitEdit()
    }, 0)
    return
  }
  commitEdit()
}

function applyFormulaRefAtCell(r: number, c: number, r1?: number, c1?: number): void {
  if (editing.value && isFormulaText(editorValue.value)) {
    insertRefIntoEditor(r, c, r1, c1)
    return
  }
  if (r1 !== undefined && c1 !== undefined) {
    emit('formula-range-pick', r, c, r1, c1)
  } else {
    emit('formula-pick', r, c)
  }
}

function previewFormulaRange(r0: number, c0: number, r1: number, c1: number): void {
  if (!editing.value || !isFormulaText(editorValue.value)) return
  const s = sheet.value
  if (!s) return
  ensureFormulaEditSynced()
  const caret = editorEl.value?.selectionStart ?? editorValue.value.length
  if (formulaEdit?.active.value) {
    formulaEdit.caret.value = caret
    formulaEdit.insertRef(s, r0, c0, r1, c1)
    editorValue.value = formulaEdit.text.value
    formulaEdit.syncHighlights(s)
  } else {
    const token = buildSheetRefToken(s, r0, c0, r1, c1)
    const { text, caret: nextCaret } = patchFormulaWithRef(editorValue.value, caret, token)
    editorValue.value = text
    syncFormulaEditFromEditor()
    nextTick(() => editorEl.value?.setSelectionRange(nextCaret, nextCaret))
  }
  scheduleDraw()
}

function onDocumentMouseMove(e: MouseEvent): void {
  const pt = cellPointFromEvent(e)
  if (!pt) return

  if (formulaDragAnchor.value !== null) {
    const a = formulaDragAnchor.value
    if (pt.r !== a.r || pt.c !== a.c) formulaDragMoved = true
    if (formulaDragMoved) previewFormulaRange(a.r, a.c, pt.r, pt.c)
    return
  }

  if (dragAnchor.value === null) return
  const a = dragAnchor.value
  applySelectRange(a.r, a.c, pt.r, pt.c)
  scheduleDraw()
}

function endDragSelect(): void {
  if (formulaDragAnchor.value !== null) {
    const a = formulaDragAnchor.value
    const selection = sheet.value?.state.getSelection()
    const r1 = selection?.row[1] ?? a.r
    const c1 = selection?.column[1] ?? a.c
    if (!formulaDragMoved) {
      applyFormulaRefAtCell(a.r, a.c)
    } else {
      ensureFormulaEditSynced()
      editorValue.value = formulaEdit?.text.value ?? editorValue.value
      const caret = formulaEdit?.caret.value ?? editorValue.value.length
      nextTick(() => {
        editorEl.value?.focus()
        editorEl.value?.setSelectionRange(caret, caret)
      })
    }
    formulaDragAnchor.value = null
    formulaDragMoved = false
    skipEditorBlurCommit = true
    restoreFormulaEditingSelection()
  }

  dragAnchor.value = null
  document.removeEventListener('mousemove', onDocumentMouseMove)
  document.removeEventListener('mouseup', endDragSelect)
  scheduleDraw()
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  closeCtxMenu()
  const pt = cellPointFromEvent(e)
  if (!pt) return
  rootEl.value?.focus()

  if (effectiveFormulaPick.value) {
    e.preventDefault()
    clearDeferredBlurCommit()
    skipEditorBlurCommit = true
    ensureFormulaEditSynced()

    if (pt.r === editR.value && pt.c === editC.value && editing.value) {
      return
    }

    formulaDragAnchor.value = { r: pt.r, c: pt.c }
    formulaDragMoved = false
    document.addEventListener('mousemove', onDocumentMouseMove)
    document.addEventListener('mouseup', endDragSelect)
    scheduleDraw()
    return
  }

  if (editing.value) commitEdit()

  dragAnchor.value = { r: pt.r, c: pt.c }
  applySelectRange(pt.r, pt.c, pt.r, pt.c)
  emit('cell-click', pt.r, pt.c)
  scheduleDraw()
  document.addEventListener('mousemove', onDocumentMouseMove)
  document.addEventListener('mouseup', endDragSelect)
}

function cellEditInitial(r: number, c: number): string {
  const s = sheet.value
  if (!s) return ''
  const cell = s.state.getCellData(r, c)
  if (cell?.f) return getCellFormulaInitial(s, r, c)
  const raw = cell?.m ?? cell?.v
  if (raw != null && raw !== '') return String(raw)
  return ''
}

function onDblClick(e: MouseEvent) {
  const pt = cellPointFromEvent(e)
  if (!pt) return
  endDragSelect()
  openEditor(pt.r, pt.c, cellEditInitial(pt.r, pt.c))
}

function commitEdit(): void {
  clearDeferredBlurCommit()
  if (!editing.value) return
  const val = editorValue.value
  const r = editR.value
  const c = editC.value
  if (isFormulaText(val)) {
    sheet.value?.chain().setCellFormula({ r, c, formula: val }).run()
  } else {
    sheet.value?.chain().setCellValue({ r, c, value: val }).run()
  }
  editing.value = false
  if (
    formulaEdit?.active.value &&
    formulaEdit.anchor.value.r === r &&
    formulaEdit.anchor.value.c === c
  ) {
    formulaEdit.cancel()
  }
  scheduleDraw()
}

function cancelEdit(): void {
  clearDeferredBlurCommit()
  editing.value = false
  if (
    formulaEdit?.active.value &&
    formulaEdit.anchor.value.r === editR.value &&
    formulaEdit.anchor.value.c === editC.value
  ) {
    formulaEdit.cancel()
  }
}

// ---- Keyboard ----
function isPrintableKey(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  return e.key.length === 1
}

function onKeyDown(e: KeyboardEvent) {
  if (editing.value) return
  const r = activeCell.value.r
  const c = activeCell.value.c
  const key = e.key

  if ((e.ctrlKey || e.metaKey) && key === 'c') {
    e.preventDefault()
    sheet.value?.chain().copy().run()
    return
  }
  if ((e.ctrlKey || e.metaKey) && key === 'x') {
    e.preventDefault()
    sheet.value?.chain().cut().run()
    return
  }
  if ((e.ctrlKey || e.metaKey) && key === 'v') {
    e.preventDefault()
    sheet.value?.chain().paste().run()
    return
  }

  if (isPrintableKey(e)) {
    e.preventDefault()
    openEditor(r, c, key)
    return
  }

  let nr = r
  let nc = c
  if (key === 'ArrowUp') nr = Math.max(0, r - 1)
  else if (key === 'ArrowDown') nr = Math.min(totalRows - 1, r + 1)
  else if (key === 'ArrowLeft') nc = Math.max(0, c - 1)
  else if (key === 'ArrowRight') nc = Math.min(totalCols - 1, c + 1)
  else if (key === 'Enter') {
    openEditor(r, c, cellEditInitial(r, c))
    return
  }
  else if (key === 'Delete' || key === 'Backspace') {
    e.preventDefault()
    sheet.value?.chain().clearSelection().run()
    return
  }
  else if (key === 'Tab') {
    e.preventDefault()
    nc = Math.min(totalCols - 1, c + 1)
  }
  else return

  e.preventDefault()
  applySelectRange(nr, nc, nr, nc)
  emit('cell-click', nr, nc)
  scheduleDraw()
}

function pointInSelection(r: number, c: number, selection: Selection): boolean {
  const [r0, r1] = selection.row
  const [c0, c1] = selection.column
  return r >= r0 && r <= r1 && c >= c0 && c <= c1
}

function isMultiCellSelection(selection: Selection): boolean {
  const [r0, r1] = selection.row
  const [c0, c1] = selection.column
  return r1 > r0 || c1 > c0
}

function resolveContextMenuHit(e: MouseEvent): ContextMenuState | null {
  const canvas = canvasEl.value
  if (!canvas) return null

  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const { rhw, chh, cw, rh } = grid.value
  const currentSel = sel.value

  endDragSelect()

  // 列头
  if (y < chh && x >= rhw) {
    const c = clampCell(0, Math.floor((x - rhw + scrollX.value) / cw)).c
    applySelectRange(0, c, totalRows - 1, c)
    scheduleDraw()
    return {
      r: currentSel.row[0],
      c,
      clientX: e.clientX,
      clientY: e.clientY,
      target: 'column',
    }
  }

  // 行头
  if (x < rhw && y >= chh) {
    const r = clampCell(Math.floor((y - chh + scrollY.value) / rh), 0).r
    applySelectRange(r, 0, r, totalCols - 1)
    scheduleDraw()
    return {
      r,
      c: currentSel.column[0],
      clientX: e.clientX,
      clientY: e.clientY,
      target: 'row',
    }
  }

  const pt = cellPointFromEvent(e)
  if (!pt) return null

  // 框选区域内右键：保留选区，菜单按 range 场景处理
  if (pointInSelection(pt.r, pt.c, currentSel) && isMultiCellSelection(currentSel)) {
    return {
      r: pt.r,
      c: pt.c,
      clientX: e.clientX,
      clientY: e.clientY,
      target: 'range',
    }
  }

  applySelectRange(pt.r, pt.c, pt.r, pt.c)
  emit('cell-click', pt.r, pt.c)
  scheduleDraw()
  return {
    r: pt.r,
    c: pt.c,
    clientX: e.clientX,
    clientY: e.clientY,
    target: 'cell',
  }
}

// ---- Right-click（UI 由 #context-menu slot 或 @context-menu 接入） ----
const ctxMenu = ref<ContextMenuState & { show: boolean }>({
  show: false,
  r: 0,
  c: 0,
  clientX: 0,
  clientY: 0,
  target: 'cell',
})

const ctxMenuPayload = computed(() => ({
  r: ctxMenu.value.r,
  c: ctxMenu.value.c,
  clientX: ctxMenu.value.clientX,
  clientY: ctxMenu.value.clientY,
  target: ctxMenu.value.target,
}))

function closeCtxMenu(): void {
  ctxMenu.value.show = false
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  const payload = resolveContextMenuHit(e)
  if (!payload) return
  ctxMenu.value = { show: true, ...payload }
  emit('context-menu', { ...payload, close: closeCtxMenu })
}

// ---- Scroll ----
function onScroll() {
  scrollX.value = scrollEl.value?.scrollLeft ?? 0
  scrollY.value = scrollEl.value?.scrollTop ?? 0
  if (editing.value) updateEditorWidth()
  closeCtxMenu()
  draw()
}

// ---- Draw ----
const MAX_CANVAS_PX = 4096
let rafId = 0
let drawDirty = false
let isDrawing = false

function scheduleDraw() {
  if (drawDirty) return
  drawDirty = true
  rafId = requestAnimationFrame(() => {
    drawDirty = false
    draw()
  })
}

function draw() {
  if (isDrawing) return
  const canvas = canvasEl.value
  const viewport = viewportEl.value
  const scroll = scrollEl.value
  if (!canvas || !viewport || !scroll) return

  isDrawing = true
  try {
    const rect = viewport.getBoundingClientRect()
    const w = Math.floor(rect.width)
    const h = Math.floor(rect.height)
    if (w <= 0 || h <= 0) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const bw = Math.min(MAX_CANVAS_PX, Math.max(1, Math.round(w * dpr)))
    const bh = Math.min(MAX_CANVAS_PX, Math.max(1, Math.round(h * dpr)))
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const nextLayout: GridLayout = {
      ...layout.value,
      viewportW: w,
      viewportH: h,
      scrollX: scrollX.value,
      scrollY: scrollY.value,
    }
    layout.value = nextLayout

    renderSheet(ctx, {
      layout: nextLayout,
      cells: cellEntries.value,
      selection: sel.value,
      isSelecting: dragAnchor.value !== null,
      editingCell: editing.value
        ? { r: editR.value, c: editC.value }
        : undefined,
      clipboardRange: sheet.value?.getClipboardRange?.() ?? null,
      formulaRefRanges: props.formulaRefRanges,
    })
  } finally {
    isDrawing = false
  }
}

// React to view / layout changes
watch(
  () => [props.rowHeaderWidth, props.columnHeaderHeight] as const,
  () => {
    layout.value = {
      ...layout.value,
      ...(props.rowHeaderWidth != null ? { rowHeaderWidth: props.rowHeaderWidth } : {}),
      ...(props.columnHeaderHeight != null ? { columnHeaderHeight: props.columnHeaderHeight } : {}),
    }
    scheduleDraw()
  },
)

watch(
  () => [props.revision, props.sheet, editing.value, props.formulaRefRanges, props.formulaPickMode] as const,
  () => {
    scheduleDraw()
  },
)

let resizeObs: ResizeObserver | null = null
let lastViewportW = 0
let lastViewportH = 0
onMounted(() => {
  resizeObs = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    const { width, height } = entry.contentRect
    if (Math.abs(width - lastViewportW) < 1 && Math.abs(height - lastViewportH) < 1) return
    lastViewportW = width
    lastViewportH = height
    scheduleDraw()
  })
  if (viewportEl.value) resizeObs.observe(viewportEl.value)
  scheduleDraw()
})
onUnmounted(() => {
  resizeObs?.disconnect()
  cancelAnimationFrame(rafId)
  endDragSelect()
})

/** 插删行列前：提交内联单元格编辑（须在网格变更前调用） */
function endEditingForLayoutChange(): void {
  if (editing.value) commitEdit()
}

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
  overflow: auto;
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

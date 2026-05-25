<template>
  <div class="sheet-root" ref="rootEl" tabindex="0" @keydown="onKeyDown">
    <!-- Formula Bar -->
    <div class="sheet-formula-bar" v-if="chrome.showFormulaBar">
      <span class="cell-ref">{{ cellRef }}</span>
      <span class="fx-label">fx</span>
      <input class="formula-input" :value="formulaText" @input="e => formulaText = (e.target as HTMLInputElement).value"
        @keydown.enter="commitFormula" @focus="onFormulaFocus" />
    </div>

    <!-- Toolbar slot -->
    <div class="sheet-toolbar" v-if="chrome.showToolbar">
      <slot name="toolbar" />
    </div>

    <!-- Viewport: fixed flex size; scroll + canvas are layered, canvas NOT inside scroll -->
    <div class="sheet-viewport" ref="viewportEl">
      <div class="sheet-scroll" ref="scrollEl" @scroll="onScroll">
        <div class="sheet-spacer" :style="{ width: totalW + 'px', height: totalH + 'px' }" aria-hidden="true" />
      </div>
      <canvas ref="canvasEl" class="sheet-canvas" @mousedown="onMouseDown" @dblclick="onDblClick"
        @contextmenu="onContextMenu" />
      <input v-if="editing" ref="editorEl" class="cell-editor" :style="editorStyle" v-model="editorValue"
        @input="updateEditorWidth" @blur="commitEdit" @keydown.enter="commitEdit" @keydown.escape="cancelEdit" />
      <slot v-if="ctxMenu.show && $slots['context-menu']" name="context-menu" v-bind="ctxMenuPayload"
        :close="closeCtxMenu" />
    </div>

    <!-- Sheet tabs -->
    <div class="sheet-bar" v-if="chrome.showSheetBar">
      <div v-for="(name, idx) in chrome.sheetNames" :key="idx" class="sheet-tab" :class="{ active: name === chrome.activeSheetName }"
        @click="$emit('switch-sheet', name)">{{ name }}</div>
      <div class="sheet-tab-add" @click="$emit('add-sheet')">+</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { renderSheet, cellFromPoint, cellRect, defaultLayout, CELL_EDITOR_OUTSET, buildCellMap, getCellTextColSpan, computeEditorWidth, type GridLayout, type CellEntry } from '@speed-sheet/core'
import type { Selection, CellAttributes } from '@speed-sheet/shared'
import type { ContextMenuState } from '../types/context-menu'
import type { SheetViewState, SheetChromeOptions } from '../types/sheet-view'

const props = defineProps<{
  view: SheetViewState
  chrome?: SheetChromeOptions
}>()

const chrome = computed(() => ({
  showToolbar: false,
  showSheetBar: true,
  showFormulaBar: true,
  sheetNames: [] as string[],
  activeSheetName: '',
  ...props.chrome,
}))

const sheet = computed(() => props.view.sheet)

const emit = defineEmits<{
  'cell-click': [r: number, c: number]
  'select-range': [r0: number, c0: number, r1: number, c1: number, anchorR: number, anchorC: number]
  'context-menu': [payload: ContextMenuState & { close: () => void }]
  'switch-sheet': [name: string]
  'add-sheet': []
  'delete-sheet': [name: string]
}>()

const rootEl = ref<HTMLElement>()
const viewportEl = ref<HTMLElement>()
const scrollEl = ref<HTMLElement>()
const canvasEl = ref<HTMLCanvasElement>()
const editorEl = ref<HTMLInputElement>()

// Grid — 与 defaultLayout / canvas 渲染共用同一套尺寸
const totalRows = 200
const totalCols = 30
const scrollX = ref(0)
const scrollY = ref(0)
const layout = ref<GridLayout>(
  defaultLayout({
    totalRows,
    totalCols,
    ...(props.view.rowHeaderWidth != null ? { rowHeaderWidth: props.view.rowHeaderWidth } : {}),
    ...(props.view.columnHeaderHeight != null ? { columnHeaderHeight: props.view.columnHeaderHeight } : {}),
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

const sel = computed(() => props.view.selection)
const cells = computed(() => props.view.cells)
const activeCell = computed(() => ({
  r: sel.value.anchor?.r ?? sel.value.row[0],
  c: sel.value.anchor?.c ?? sel.value.column[0],
}))
const cellRef = computed(() => `${colLetter(activeCell.value.c)}${activeCell.value.r + 1}`)
const cellEntries = computed<CellEntry[]>(() =>
  cells.value.map((c) => ({ r: c.r, c: c.c, data: c.data } as CellEntry)),
)

function colLetter(c: number): string { let s = ''; let n = c; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 } while (n >= 0); return s }

// ---- Formula bar ----
const formulaText = ref('')
function onFormulaFocus() {
  const { r, c } = activeCell.value
  const cell = cellEntries.value.find(x => x.r === r && x.c === c)
  formulaText.value = cell?.data?.f ?? cell?.data?.v?.toString() ?? ''
}
function commitFormula() {
  const { r, c } = activeCell.value
  sheet.value?.chain().setCellValue({ r, c, value: formulaText.value }).run()
}

// ---- Inline edit ----
const editing = ref(false); const editorValue = ref(''); const editR = ref(0); const editC = ref(0)
const editorWidthPx = ref(0)

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

function emitSelectRange(r0: number, c0: number, r1: number, c1: number): void {
  const a = dragAnchor.value ?? { r: r0, c: c0 }
  emit('select-range', r0, c0, r1, c1, a.r, a.c)
}

function openEditor(r: number, c: number, initial = ''): void {
  editR.value = r
  editC.value = c
  editorValue.value = initial
  editing.value = true
  nextTick(() => {
    updateEditorWidth()
    const el = editorEl.value
    if (!el) return
    el.focus()
    if (initial.length > 0) {
      el.setSelectionRange(initial.length, initial.length)
    } else {
      el.select()
    }
  })
}

function onDocumentMouseMove(e: MouseEvent): void {
  if (dragAnchor.value === null) return
  const pt = cellPointFromEvent(e)
  if (!pt) return
  const a = dragAnchor.value
  emitSelectRange(a.r, a.c, pt.r, pt.c)
  scheduleDraw()
}

function endDragSelect(): void {
  dragAnchor.value = null
  document.removeEventListener('mousemove', onDocumentMouseMove)
  document.removeEventListener('mouseup', endDragSelect)
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  if (editing.value) commitEdit()
  closeCtxMenu()
  const pt = cellPointFromEvent(e)
  if (!pt) return
  rootEl.value?.focus()
  dragAnchor.value = { r: pt.r, c: pt.c }
  emit('cell-click', pt.r, pt.c)
  emitSelectRange(pt.r, pt.c, pt.r, pt.c)
  document.addEventListener('mousemove', onDocumentMouseMove)
  document.addEventListener('mouseup', endDragSelect)
}

function onDblClick(e: MouseEvent) {
  const pt = cellPointFromEvent(e)
  if (!pt) return
  endDragSelect()
  const cell = cells.value.find(x => x.r === pt.r && x.c === pt.c)
  openEditor(pt.r, pt.c, cell?.data?.v?.toString() ?? cell?.data?.m?.toString() ?? '')
}

function commitEdit() { if (!editing.value) return; sheet.value?.chain().setCellValue({ r: editR.value, c: editC.value, value: editorValue.value }).run(); editing.value = false }
function cancelEdit() { editing.value = false }

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
    const cell = cells.value.find(x => x.r === r && x.c === c)
    openEditor(r, c, cell?.data?.v?.toString() ?? cell?.data?.m?.toString() ?? '')
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
  emit('cell-click', nr, nc)
  emitSelectRange(nr, nc, nr, nc)
}

// ---- Right-click（UI 由 #context-menu slot 或 @context-menu 接入） ----
const ctxMenu = ref<ContextMenuState & { show: boolean }>({
  show: false,
  r: 0,
  c: 0,
  clientX: 0,
  clientY: 0,
})

const ctxMenuPayload = computed(() => ({
  r: ctxMenu.value.r,
  c: ctxMenu.value.c,
  clientX: ctxMenu.value.clientX,
  clientY: ctxMenu.value.clientY,
}))

function closeCtxMenu(): void {
  ctxMenu.value.show = false
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  const pt = cellPointFromEvent(e)
  if (pt) {
    emit('cell-click', pt.r, pt.c)
    emitSelectRange(pt.r, pt.c, pt.r, pt.c)
  }
  const payload: ContextMenuState = {
    r: pt?.r ?? activeCell.value.r,
    c: pt?.c ?? activeCell.value.c,
    clientX: e.clientX,
    clientY: e.clientY,
  }
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
    })
  } finally {
    isDrawing = false
  }
}

// React to view / layout changes
watch(
  () => [props.view.rowHeaderWidth, props.view.columnHeaderHeight] as const,
  () => {
    layout.value = {
      ...layout.value,
      ...(props.view.rowHeaderWidth != null ? { rowHeaderWidth: props.view.rowHeaderWidth } : {}),
      ...(props.view.columnHeaderHeight != null ? { columnHeaderHeight: props.view.columnHeaderHeight } : {}),
    }
    scheduleDraw()
  },
)

watch(
  () => [props.view.revision, props.view.selection, editing.value] as const,
  () => {
    scheduleDraw()
    syncFormulaFromCell()
  },
)

function syncFormulaFromCell(): void {
  const { r, c } = activeCell.value
  const cell = cells.value.find(x => x.r === r && x.c === c)
  formulaText.value = cell?.data?.f ?? String(cell?.data?.m ?? cell?.data?.v ?? '')
}

let resizeObs: ResizeObserver | null = null
let lastViewportW = 0
let lastViewportH = 0
onMounted(() => {
  syncFormulaFromCell()
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

defineExpose({ viewportEl })
</script>

<style scoped>
.sheet-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
  font-size: 11px;
  outline: none;
}

.sheet-formula-bar {
  height: 28px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #d0d0d0;
  padding: 0 6px;
  gap: 6px;
  background: #fff;
  flex-shrink: 0;
}

.cell-ref {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  min-width: 52px;
  text-align: center;
  color: #333;
  background: #fafafa;
}

.fx-label {
  font-style: italic;
  font-weight: 700;
  color: #999;
  font-size: 12px;
}

.formula-input {
  flex: 1;
  height: 22px;
  border: 1px solid #d0d0d0;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
}

.formula-input:focus {
  border-color: #1a73e8;
}

.sheet-toolbar {
  flex-shrink: 0;
  border-bottom: 1px solid #d0d0d0;
  background: #fafafa;
  padding: 2px 6px;
  min-height: 32px;
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

.cell-editor {
  position: absolute;
  z-index: 10;
  border: 2px solid #1a73e8;
  outline: none;
  padding: 0 4px;
  margin: 0;
  font-size: 11px;
  line-height: calc(1em + 2px);
  font-family: -apple-system, sans-serif;
  background: #fff;
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
}

.sheet-bar {
  height: 31px;
  border-top: 1px solid #d0d0d0;
  display: flex;
  align-items: center;
  padding: 0 4px;
  background: #f0f0f0;
  gap: 1px;
  overflow-x: auto;
  flex-shrink: 0;
}

.sheet-tab {
  padding: 2px 16px;
  background: #e0e0e0;
  cursor: pointer;
  white-space: nowrap;
  font-size: 11px;
  border-radius: 4px 4px 0 0;
  margin-top: 2px;
}

.sheet-tab:hover {
  background: #d0d0d0;
}

.sheet-tab.active {
  background: #fff;
  font-weight: 600;
  border-bottom: 2px solid #1a73e8;
}

.sheet-tab-add {
  padding: 2px 8px;
  cursor: pointer;
  font-weight: bold;
  color: #666;
  font-size: 14px;
}

.sheet-tab-add:hover {
  background: #d0d0d0;
  border-radius: 2px;
}
</style>

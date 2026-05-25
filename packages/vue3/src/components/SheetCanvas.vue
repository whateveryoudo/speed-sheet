<template>
  <div class="sheet-canvas-root" ref="rootEl" tabindex="0" @keydown="onKeyDown">
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { renderSheet, cellFromPoint, cellRect, defaultLayout, CELL_EDITOR_OUTSET, buildCellMap, getCellTextColSpan, computeEditorWidth, type GridLayout, type CellEntry } from '@speed-sheet/core'
import type { Selection, CellAttributes } from '@speed-sheet/shared'
import type { Sheet } from '@speed-sheet/core'
import type { ContextMenuState } from '../types/context-menu'

const props = withDefaults(defineProps<{
  sheet: Sheet | null
  /** 与 useSheet.revision 联动，触发 canvas 重绘 */
  revision?: number
  rowHeaderWidth?: number
  columnHeaderHeight?: number
}>(), {
  revision: 0,
})

const sheet = computed(() => props.sheet)

const EMPTY_SEL: Selection = { row: [0, 0], column: [0, 0] }

const emit = defineEmits<{
  'cell-click': [r: number, c: number]
  'select-range': [r0: number, c0: number, r1: number, c1: number, anchorR: number, anchorC: number]
  'context-menu': [payload: ContextMenuState & { close: () => void }]
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
  applySelectRange(a.r, a.c, pt.r, pt.c)
  scheduleDraw()
}

function endDragSelect(): void {
  dragAnchor.value = null
  document.removeEventListener('mousemove', onDocumentMouseMove)
  document.removeEventListener('mouseup', endDragSelect)
  scheduleDraw()
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  if (editing.value) commitEdit()
  closeCtxMenu()
  const pt = cellPointFromEvent(e)
  if (!pt) return
  rootEl.value?.focus()
  dragAnchor.value = { r: pt.r, c: pt.c }
  applySelectRange(pt.r, pt.c, pt.r, pt.c)
  emit('cell-click', pt.r, pt.c)
  scheduleDraw()
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
  applySelectRange(nr, nc, nr, nc)
  emit('cell-click', nr, nc)
  scheduleDraw()
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
    applySelectRange(pt.r, pt.c, pt.r, pt.c)
    emit('cell-click', pt.r, pt.c)
    scheduleDraw()
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
  () => [props.revision, props.sheet, editing.value] as const,
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

defineExpose({
  viewportEl,
  sheet,
  getSelection: () => sheet.value?.state.getSelection(),
  chain: () => sheet.value?.chain(),
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
</style>

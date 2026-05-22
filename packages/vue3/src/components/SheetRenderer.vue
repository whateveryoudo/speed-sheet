<template>
  <div class="sheet-root" ref="rootEl" tabindex="0" @keydown="onKeyDown">
    <!-- Formula Bar -->
    <div class="sheet-formula-bar" v-if="showFormulaBar">
      <span class="cell-ref">{{ cellRef }}</span>
      <span class="fx-label">fx</span>
      <input
        class="formula-input"
        :value="formulaText"
        @input="e => formulaText = (e.target as HTMLInputElement).value"
        @keydown.enter="commitFormula"
        @focus="onFormulaFocus"
      />
    </div>

    <!-- Toolbar slot -->
    <div class="sheet-toolbar" v-if="showToolbar">
      <slot name="toolbar" />
    </div>

    <!-- Viewport: fixed flex size; scroll + canvas are layered, canvas NOT inside scroll -->
    <div class="sheet-viewport" ref="viewportEl">
      <div class="sheet-scroll" ref="scrollEl" @scroll="onScroll">
        <div class="sheet-spacer" :style="{ width: totalW + 'px', height: totalH + 'px' }" aria-hidden="true" />
      </div>
      <canvas ref="canvasEl" class="sheet-canvas" @mousedown="onMouseDown" @dblclick="onDblClick" @contextmenu="onContextMenu" />
      <input
        v-if="editing"
        ref="editorEl"
        class="cell-editor"
        :style="editorStyle"
        v-model="editorValue"
        @blur="commitEdit"
        @keydown.enter="commitEdit"
        @keydown.escape="cancelEdit"
      />
      <div
        v-if="ctxMenu.show"
        class="ctx-menu"
        :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
        @mousedown.prevent
      >
        <div class="ctx-item" @click="ctxCopy">Copy</div>
        <div class="ctx-item" @click="ctxCut">Cut</div>
        <div class="ctx-item" @click="ctxPaste">Paste</div>
        <div class="ctx-div" />
        <div class="ctx-item" @click="ctxInsertRow">Insert row above</div>
        <div class="ctx-item" @click="ctxDeleteRow">Delete row</div>
        <div class="ctx-item" @click="ctxInsertCol">Insert column left</div>
        <div class="ctx-div" />
        <div class="ctx-item" @click="ctxClear">Clear contents</div>
      </div>
    </div>

    <!-- Sheet tabs -->
    <div class="sheet-bar" v-if="showSheetBar">
      <div
        v-for="(name, idx) in sheetNames"
        :key="idx"
        class="sheet-tab"
        :class="{ active: name === activeSheetName }"
        @click="$emit('switch-sheet', name)"
      >{{ name }}</div>
      <div class="sheet-tab-add" @click="$emit('add-sheet')">+</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, withDefaults } from 'vue'
import { renderSheet, cellFromPoint, cellRect, defaultLayout, type GridLayout, type CellEntry } from '@speed-sheet/core'
import type { Selection, CellAttributes } from '@speed-sheet/shared'

const props = withDefaults(defineProps<{
  selection?: Selection
  sheetNames?: string[]
  activeSheetName?: string
  showToolbar?: boolean
  /** 底部 sheet 页签（Fortune Sheet: showSheetTabs） */
  showSheetBar?: boolean
  showFormulaBar?: boolean
  rowHeaderWidth?: number
  columnHeaderHeight?: number
  cells?: Array<{ r: number; c: number; data: CellAttributes }>
  sheet?: any
}>(), {
  showToolbar: false,
  showSheetBar: true,
  showFormulaBar: true,
})

const emit = defineEmits<{
  'cell-click': [r: number, c: number]
  'switch-sheet': [name: string]
  'add-sheet': []
  'delete-sheet': [name: string]
}>()

const rootEl = ref<HTMLElement>()
const viewportEl = ref<HTMLElement>()
const scrollEl = ref<HTMLElement>()
const canvasEl = ref<HTMLCanvasElement>()
const editorEl = ref<HTMLInputElement>()

// Grid constants
const RHW = 46; const CHH = 20; const CW = 73; const RH = 19
const totalRows = 200; const totalCols = 30
const totalW = RHW + totalCols * CW
const totalH = CHH + totalRows * RH

const scrollX = ref(0); const scrollY = ref(0)
const layout = ref<GridLayout>(defaultLayout({ totalRows, totalCols }))

const sel = computed(() => props.selection ?? { row: [0, 0] as [number, number], column: [0, 0] as [number, number] })
const cellRef = computed(() => `${colLetter(sel.value.column[0])}${sel.value.row[0] + 1}`)
const cellEntries = computed<CellEntry[]>(() => (props.cells ?? []).map(c => ({ r: c.r, c: c.c, data: c.data } as CellEntry)))

function colLetter(c: number): string { let s=''; let n=c; do { s=String.fromCharCode(65+(n%26))+s; n=Math.floor(n/26)-1 } while (n>=0); return s }

// ---- Formula bar ----
const formulaText = ref('')
function onFormulaFocus() {
  const cell = cellEntries.value.find(c => (c as any).r === sel.value.row[0] && (c as any).c === sel.value.column[0])
  formulaText.value = (cell as any)?.data?.f ?? (cell as any)?.data?.v?.toString() ?? ''
}
function commitFormula() {
  props.sheet?.chain().setCellValue({ r: sel.value.row[0], c: sel.value.column[0], value: formulaText.value }).run()
}

// ---- Inline edit ----
const editing = ref(false); const editorValue = ref(''); const editR = ref(0); const editC = ref(0)
const editorStyle = computed(() => {
  const r = cellRect(editR.value, editC.value, layout.value)
  return { left: (r.x - scrollX.value + 1) + 'px', top: (r.y - scrollY.value + 1) + 'px', width: (r.w - 2) + 'px', height: (r.h - 3) + 'px' }
})

// ---- Mouse events (on canvas) ----
function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  if (editing.value) commitEdit()
  ctxMenu.value.show = false
  const rect = canvasEl.value!.getBoundingClientRect()
  const pt = cellFromPoint(e.clientX, e.clientY, rect, layout.value)
  if (pt.r >= 0 && pt.c >= 0) { emit('cell-click', pt.r, pt.c); rootEl.value?.focus() }
}

function onDblClick(e: MouseEvent) {
  const rect = canvasEl.value!.getBoundingClientRect()
  const pt = cellFromPoint(e.clientX, e.clientY, rect, layout.value)
  if (pt.r < 0 || pt.c < 0) return
  const cell = (props.cells ?? []).find(x => x.r === pt.r && x.c === pt.c)
  editR.value = pt.r; editC.value = pt.c
  editorValue.value = cell?.data?.v?.toString() ?? ''
  editing.value = true
  nextTick(() => editorEl.value?.focus())
}

function commitEdit() { if (!editing.value) return; props.sheet?.chain().setCellValue({ r: editR.value, c: editC.value, value: editorValue.value }).run(); editing.value = false }
function cancelEdit() { editing.value = false }

// ---- Keyboard ----
function onKeyDown(e: KeyboardEvent) {
  if (editing.value) return
  const key = e.key; let r = sel.value.row[0], c = sel.value.column[0]
  if (key === 'ArrowUp') r = Math.max(0, r - 1)
  else if (key === 'ArrowDown') r = Math.min(totalRows - 1, r + 1)
  else if (key === 'ArrowLeft') c = Math.max(0, c - 1)
  else if (key === 'ArrowRight') c = Math.min(totalCols - 1, c + 1)
  else if (key === 'Enter') { editR.value = r; editC.value = c; editorValue.value = ''; editing.value = true; nextTick(() => editorEl.value?.focus()); return }
  else if (key === 'Delete' || key === 'Backspace') { props.sheet?.chain().clearCell({ r, c }).run(); return }
  else if (key === 'Tab') { e.preventDefault(); c = Math.min(totalCols - 1, c + 1) }
  else return
  e.preventDefault()
  emit('cell-click', r, c)
}

// ---- Right-click ----
const ctxMenu = ref({ show: false, x: 0, y: 0 })
function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  const rect = canvasEl.value!.getBoundingClientRect()
  const pt = cellFromPoint(e.clientX, e.clientY, rect, layout.value)
  if (pt.r >= 0 && pt.c >= 0) emit('cell-click', pt.r, pt.c)
  const vr = viewportEl.value!.getBoundingClientRect()
  ctxMenu.value = { show: true, x: e.clientX - vr.left, y: e.clientY - vr.top }
  setTimeout(() => document.addEventListener('click', () => ctxMenu.value.show = false, { once: true }), 0)
}
function ctxCopy() { closeCtx(); props.sheet?.chain().copy?.()?.run() }
function ctxCut() { closeCtx(); props.sheet?.chain().copy?.()?.run(); props.sheet?.chain().clearCell({ r: sel.value.row[0], c: sel.value.column[0] }).run() }
function ctxPaste() { closeCtx(); props.sheet?.chain().paste?.()?.run() }
function ctxInsertRow() { closeCtx() }
function ctxDeleteRow() { closeCtx() }
function ctxInsertCol() { closeCtx() }
function ctxClear() { closeCtx(); props.sheet?.chain().clearCell({ r: sel.value.row[0], c: sel.value.column[0] }).run() }
function closeCtx() { ctxMenu.value.show = false }

// ---- Scroll ----
function onScroll() {
  scrollX.value = scrollEl.value?.scrollLeft ?? 0
  scrollY.value = scrollEl.value?.scrollTop ?? 0
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

    renderSheet(ctx, { layout: nextLayout, cells: cellEntries.value, selection: sel.value })
  } finally {
    isDrawing = false
  }
}

// React to data changes
watch(() => [props.cells, props.selection], () => {
  scheduleDraw()
  syncFormulaFromCell()
}, { deep: true })

function syncFormulaFromCell(): void {
  const cell = (props.cells ?? []).find(
    x => x.r === sel.value.row[0] && x.c === sel.value.column[0],
  )
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
onUnmounted(() => { resizeObs?.disconnect(); cancelAnimationFrame(rafId) })
</script>

<style scoped>
.sheet-root { display: flex; flex-direction: column; height: 100%; width: 100%; min-height: 0; font-size: 11px; outline: none; }
.sheet-formula-bar { height: 28px; display: flex; align-items: center; border-bottom: 1px solid #d0d0d0; padding: 0 6px; gap: 6px; background: #fff; flex-shrink: 0; }
.cell-ref { font-family: monospace; font-size: 11px; font-weight: 600; padding: 2px 10px; border: 1px solid #e0e0e0; border-radius: 3px; min-width: 52px; text-align: center; color: #333; background: #fafafa; }
.fx-label { font-style: italic; font-weight: 700; color: #999; font-size: 12px; }
.formula-input { flex: 1; height: 22px; border: 1px solid #d0d0d0; border-radius: 3px; padding: 0 6px; font-size: 11px; outline: none; }
.formula-input:focus { border-color: #1a73e8; }
.sheet-toolbar { flex-shrink: 0; border-bottom: 1px solid #d0d0d0; background: #fafafa; padding: 2px 6px; min-height: 32px; }
.sheet-viewport { flex: 1 1 0; min-height: 0; min-width: 0; position: relative; overflow: hidden; background: #fff; contain: strict; }
.sheet-scroll { position: absolute; inset: 0; overflow: auto; }
.sheet-spacer { pointer-events: none; }
.sheet-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: cell; z-index: 1; pointer-events: auto; }
.cell-editor { position: absolute; z-index: 10; border: 2px solid #1a73e8; outline: none; padding: 0 3px; font-size: 11px; font-family: -apple-system, sans-serif; background: #fff; box-sizing: border-box; }
.sheet-bar { height: 31px; border-top: 1px solid #d0d0d0; display: flex; align-items: center; padding: 0 4px; background: #f0f0f0; gap: 1px; overflow-x: auto; flex-shrink: 0; }
.sheet-tab { padding: 2px 16px; background: #e0e0e0; cursor: pointer; white-space: nowrap; font-size: 11px; border-radius: 4px 4px 0 0; margin-top: 2px; }
.sheet-tab:hover { background: #d0d0d0; }
.sheet-tab.active { background: #fff; font-weight: 600; border-bottom: 2px solid #1a73e8; }
.sheet-tab-add { padding: 2px 8px; cursor: pointer; font-weight: bold; color: #666; font-size: 14px; }
.sheet-tab-add:hover { background: #d0d0d0; border-radius: 2px; }
.ctx-menu { position: absolute; z-index: 100; background: #fff; border: 1px solid #d0d0d0; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,.12); padding: 4px 0; min-width: 160px; font-size: 12px; }
.ctx-item { padding: 6px 16px; cursor: pointer; color: #333; }
.ctx-item:hover { background: #f0f0f0; }
.ctx-div { height: 1px; background: #eee; margin: 4px 0; }
</style>

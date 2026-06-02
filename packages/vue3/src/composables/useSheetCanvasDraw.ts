import { onMounted, onUnmounted, watch, type Ref, type ComputedRef } from 'vue'
import {
  renderSheet,
  buildSheetGridMetrics,
  type GridLayout,
  type CellEntry,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'
import type { RenderOptions } from '@speed-sheet/core'

const MAX_CANVAS_PX = 4096

export function useSheetCanvasDraw(options: {
  canvasEl: Ref<HTMLCanvasElement | undefined>
  viewportEl: Ref<HTMLElement | undefined>
  scrollEl: Ref<HTMLElement | undefined>
  sheet: Ref<Sheet | null>
  layout: Ref<GridLayout>
  scrollX: Ref<number>
  scrollY: Ref<number>
  gridMetrics: ComputedRef<GridMetrics>
  cellEntries: ComputedRef<CellEntry[]>
  selection: ComputedRef<Selection>
  isSelecting: () => boolean
  editing: Ref<boolean>
  editR: Ref<number>
  editC: Ref<number>
  formulaRefRanges: Ref<RenderOptions['formulaRefRanges']>
  revision: Ref<number>
  rowHeaderWidth: Ref<number | undefined>
  columnHeaderHeight: Ref<number | undefined>
  onScrollLayout: () => void
}) {
  let rafId = 0
  let resizeRafId = 0
  let drawDirty = false
  let isDrawing = false
  let resizeObs: ResizeObserver | null = null
  let lastViewportW = 0
  let lastViewportH = 0

  /** 与 canvas 显示区域一致，避免 viewport 与 canvas CSS 尺寸不一致导致放大/缩小 */
  function readCanvasDisplaySize(canvas: HTMLCanvasElement): { w: number; h: number } {
    const rect = canvas.getBoundingClientRect()
    return {
      w: Math.max(0, Math.round(rect.width)),
      h: Math.max(0, Math.round(rect.height)),
    }
  }

  function scheduleDraw(): void {
    if (drawDirty) return
    drawDirty = true
    // 后台标签页会节流 rAF，协同远程变更需立即绘制
    if (typeof document !== 'undefined' && document.hidden) {
      drawDirty = false
      draw()
      return
    }
    rafId = requestAnimationFrame(() => {
      drawDirty = false
      draw()
    })
  }

  function draw(): void {
    if (isDrawing) return
    const canvas = options.canvasEl.value
    const scroll = options.scrollEl.value
    if (!canvas || !scroll) return

    isDrawing = true
    try {
      const { w, h } = readCanvasDisplaySize(canvas)
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

      const metrics = options.sheet.value
        ? buildSheetGridMetrics(options.sheet.value, options.layout.value)
        : options.gridMetrics.value
      const prev = options.layout.value
      const nextLayout: GridLayout = {
        ...prev,
        viewportW: w,
        viewportH: h,
        scrollX: options.scrollX.value,
        scrollY: options.scrollY.value,
        metrics,
        totalRows: metrics.totalRows,
        totalCols: metrics.totalCols,
      }
      // 行列高宽变更后 metrics 会变，必须同步 layout（否则浮动层仍用旧 metrics，需滚动才刷新）
      options.layout.value = nextLayout

      const dvMap = new Map<string, import('@speed-sheet/shared').DataVerificationRule>()
      const state = options.sheet.value?.state
      if (state) {
        for (const item of state.getAllDataVerifications()) {
          dvMap.set(`${item.r}_${item.c}`, item.rule)
        }
      }

      renderSheet(ctx, {
        layout: nextLayout,
        cells: options.cellEntries.value,
        mergeCtx: options.sheet.value?.createMergeContext(),
        selection: options.selection.value,
        isSelecting: options.isSelecting(),
        editingCell: options.editing.value
          ? { r: options.editR.value, c: options.editC.value }
          : undefined,
        clipboardRange: options.sheet.value?.getClipboardRange?.() ?? null,
        formulaRefRanges: options.formulaRefRanges.value,
        dataVerifications: dvMap,
        filterView: options.sheet.value?.getFilterView() ?? null,
      })
    } finally {
      isDrawing = false
    }
  }

  function onScroll(): void {
    options.scrollX.value = options.scrollEl.value?.scrollLeft ?? 0
    options.scrollY.value = options.scrollEl.value?.scrollTop ?? 0
    options.onScrollLayout()
    draw()
  }

  watch(
    () => [options.rowHeaderWidth.value, options.columnHeaderHeight.value] as const,
    () => {
      options.layout.value = {
        ...options.layout.value,
        ...(options.rowHeaderWidth.value != null
          ? { rowHeaderWidth: options.rowHeaderWidth.value }
          : {}),
        ...(options.columnHeaderHeight.value != null
          ? { columnHeaderHeight: options.columnHeaderHeight.value }
          : {}),
      }
      scheduleDraw()
    },
  )

  watch(
    () =>
      [
        options.revision.value,
        options.sheet.value,
        options.editing.value,
        options.formulaRefRanges.value,
      ] as const,
    () => scheduleDraw(),
  )

  function onVisibilityChange(): void {
    if (!document.hidden) scheduleDraw()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    resizeObs = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (!entry) return
      cancelAnimationFrame(resizeRafId)
      resizeRafId = requestAnimationFrame(() => {
        const w = Math.round(entry.contentRect.width)
        const h = Math.round(entry.contentRect.height)
        if (w <= 0 || h <= 0) return
        if (w === lastViewportW && h === lastViewportH) return
        lastViewportW = w
        lastViewportH = h
        scheduleDraw()
      })
    })
    const vp = options.viewportEl.value
    const canvas = options.canvasEl.value
    if (vp) {
      resizeObs.observe(vp)
      if (canvas) {
        const { w, h } = readCanvasDisplaySize(canvas)
        lastViewportW = w
        lastViewportH = h
      }
    }
    scheduleDraw()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    resizeObs?.disconnect()
    cancelAnimationFrame(rafId)
    cancelAnimationFrame(resizeRafId)
  })

  return { scheduleDraw, draw, onScroll }
}

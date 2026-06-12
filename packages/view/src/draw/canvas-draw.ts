import {
  renderSheet,
  buildSheetGridMetrics,
  validateExistingFreezeInViewport,
  type GridLayout,
  type CellEntry,
  type GridMetrics,
  type Sheet,
  type RenderOptions,
} from '@speed-sheet/core'
import { getProtectionEntries } from '@speed-sheet/extension-protection'
import { buildCfRenderMaps, getCfRules } from '@speed-sheet/extension-conditional-format'
import type { Selection } from '@speed-sheet/shared'
import type { DataVerificationRule } from '@speed-sheet/shared'

const MAX_CANVAS_PX = 4096

export function readCanvasDisplaySize(canvas: HTMLCanvasElement): { w: number; h: number } {
  const rect = canvas.getBoundingClientRect()
  return {
    w: Math.max(0, Math.round(rect.width)),
    h: Math.max(0, Math.round(rect.height)),
  }
}

export type CanvasDrawOptions = {
  getCanvas: () => HTMLCanvasElement | undefined
  getScrollEl: () => HTMLElement | undefined
  getViewportEl: () => HTMLElement | undefined
  getSheet: () => Sheet | null
  getLayout: () => GridLayout
  setLayout: (layout: GridLayout) => void
  getScrollX: () => number
  setScrollX: (x: number) => void
  getScrollY: () => number
  setScrollY: (y: number) => void
  getGridMetrics: () => GridMetrics
  getCellEntries: (layout: GridLayout) => CellEntry[]
  getSelection: () => Selection
  isSelecting: () => boolean
  isEditing: () => boolean
  getEditR: () => number
  getEditC: () => number
  getFormulaRefRanges: () => RenderOptions['formulaRefRanges']
  getRevision: () => number
  getRowHeaderWidth: () => number | undefined
  getColumnHeaderHeight: () => number | undefined
  onScrollLayout: () => void
  onFreezeInvalid?: () => void
}

export class CanvasDrawController {
  private rafId = 0
  private resizeRafId = 0
  private drawDirty = false
  private isDrawing = false
  private resizeObs: ResizeObserver | null = null
  private lastViewportW = 0
  private lastViewportH = 0
  private onVisibilityChange = (): void => {
    if (!document.hidden) this.scheduleDraw()
  }

  constructor(private readonly options: CanvasDrawOptions) {}

  scheduleDraw(): void {
    if (this.drawDirty) return
    this.drawDirty = true
    if (typeof document !== 'undefined' && document.hidden) {
      this.drawDirty = false
      this.draw()
      return
    }
    this.rafId = requestAnimationFrame(() => {
      this.drawDirty = false
      this.draw()
    })
  }

  /** 立即重绘（mouseup 等需同步看到填充柄的场景） */
  flushDraw(): void {
    this.drawDirty = false
    cancelAnimationFrame(this.rafId)
    this.draw()
  }

  draw(): void {
    if (this.isDrawing) return
    const canvas = this.options.getCanvas()
    const scroll = this.options.getScrollEl()
    if (!canvas || !scroll) return

    this.isDrawing = true
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

      const sheet = this.options.getSheet()
      const metrics = sheet
        ? buildSheetGridMetrics(sheet, this.options.getLayout())
        : this.options.getGridMetrics()
      const prev = this.options.getLayout()
      const freeze = sheet?.state.getFreezeState() ?? null
      const nextLayout: GridLayout = {
        ...prev,
        viewportW: w,
        viewportH: h,
        scrollX: this.options.getScrollX(),
        scrollY: this.options.getScrollY(),
        metrics,
        totalRows: metrics.totalRows,
        totalCols: metrics.totalCols,
        freeze,
      }
      this.options.setLayout(nextLayout)

      const dvMap = new Map<string, DataVerificationRule>()
      const state = sheet?.state
      if (state) {
        for (const item of state.getAllDataVerifications()) {
          dvMap.set(`${item.r}_${item.c}`, item.rule)
        }
      }

      const freezeInvalid =
        freeze != null && !validateExistingFreezeInViewport(nextLayout, metrics, freeze)
      if (freezeInvalid) {
        sheet?.chain().clearFreeze().run()
        this.options.onFreezeInvalid?.()
      }

      const cellEntries = this.options.getCellEntries(
        freezeInvalid ? { ...nextLayout, freeze: null } : nextLayout,
      )
      const cfMaps =
        sheet && state
          ? buildCfRenderMaps(getCfRules(sheet), state, cellEntries)
          : { cellStyles: new Map(), dataBars: new Map() }

      renderSheet(ctx, {
        layout: freezeInvalid ? { ...nextLayout, freeze: null } : nextLayout,
        cells: cellEntries,
        mergeCtx: sheet?.createMergeContext(),
        selection: this.options.getSelection(),
        isSelecting: this.options.isSelecting(),
        editingCell: this.options.isEditing()
          ? { r: this.options.getEditR(), c: this.options.getEditC() }
          : undefined,
        clipboardRange: sheet?.getClipboardRange?.() ?? null,
        formulaRefRanges: this.options.getFormulaRefRanges(),
        dataVerifications: dvMap,
        filterView: sheet?.getFilterView() ?? null,
        protections: sheet ? getProtectionEntries(sheet) : undefined,
        conditionalFormatStyles: cfMaps.cellStyles,
        conditionalFormatDataBars: cfMaps.dataBars,
        images: state?.getAllImages() ?? [],
        onImageLoaded: () => this.scheduleDraw(),
      })
    } finally {
      this.isDrawing = false
    }
  }

  onScroll(): void {
    const scroll = this.options.getScrollEl()
    this.options.setScrollX(scroll?.scrollLeft ?? 0)
    this.options.setScrollY(scroll?.scrollTop ?? 0)
    this.options.onScrollLayout()
    this.draw()
  }

  onHeaderSizesChange(): void {
    const layout = this.options.getLayout()
    this.options.setLayout({
      ...layout,
      ...(this.options.getRowHeaderWidth() != null
        ? { rowHeaderWidth: this.options.getRowHeaderWidth()! }
        : {}),
      ...(this.options.getColumnHeaderHeight() != null
        ? { columnHeaderHeight: this.options.getColumnHeaderHeight()! }
        : {}),
    })
    this.scheduleDraw()
  }

  onDataChange(): void {
    void this.options.getRevision()
    void this.options.getSheet()
    void this.options.isEditing()
    void this.options.getFormulaRefRanges()
    this.scheduleDraw()
  }

  attach(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.resizeObs = new ResizeObserver((entries) => {
      const entry = entries[entries.length - 1]
      if (!entry) return
      cancelAnimationFrame(this.resizeRafId)
      this.resizeRafId = requestAnimationFrame(() => {
        const w = Math.round(entry.contentRect.width)
        const h = Math.round(entry.contentRect.height)
        if (w <= 0 || h <= 0) return
        if (w === this.lastViewportW && h === this.lastViewportH) return
        this.lastViewportW = w
        this.lastViewportH = h
        this.scheduleDraw()
      })
    })
    const vp = this.options.getViewportEl()
    const canvas = this.options.getCanvas()
    if (vp) {
      this.resizeObs.observe(vp)
      if (canvas) {
        const { w, h } = readCanvasDisplaySize(canvas)
        this.lastViewportW = w
        this.lastViewportH = h
      }
    }
    this.scheduleDraw()
  }

  detach(): void {
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.resizeObs?.disconnect()
    cancelAnimationFrame(this.rafId)
    cancelAnimationFrame(this.resizeRafId)
  }
}

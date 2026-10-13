import {
  RowMoveSession,
  pointerFromMouseEvent,
  type GridLayout,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'

export type MoveGuideState = { active: boolean; pos: number }
export type MoveHintState = { show: boolean; x: number; y: number; text: string }

export type RowMoveOptions = {
  getCanvas: () => HTMLCanvasElement | undefined
  getViewport: () => HTMLElement | undefined
  getLayout: () => GridLayout
  getMetrics: () => GridMetrics
  getSheet: () => Sheet | null
  onDraw: () => void
  onGuideChange: (guide: MoveGuideState) => void
  onHintChange: (hint: MoveHintState) => void
  onSelectRange?: (r0: number, c0: number, r1: number, c1: number, anchorR: number, anchorC: number) => void
}

export class RowMoveController {
  private readonly session = new RowMoveSession()
  private guide: MoveGuideState = { active: false, pos: 0 }
  private hint: MoveHintState = { show: false, x: 0, y: 0, text: '' }
  private startPointer: { x: number; y: number } | null = null
  private startRow = 0
  private readonly onDocumentMove = (e: MouseEvent): void => this.updateFromEvent(e)
  private readonly onDocumentUp = (e: MouseEvent): void => this.end(e)

  constructor(private readonly options: RowMoveOptions) {}

  isActive(): boolean {
    return this.session.active
  }

  private setGuide(guide: MoveGuideState): void {
    this.guide = guide
    this.options.onGuideChange(guide)
  }

  private setHint(hint: MoveHintState): void {
    this.hint = hint
    this.options.onHintChange(hint)
  }

  updateFromEvent(e: MouseEvent): void {
    const canvas = this.options.getCanvas()
    const viewport = this.options.getViewport()
    if (!this.session.active || !canvas || !viewport) return

    const rect = canvas.getBoundingClientRect()
    const vpRect = viewport.getBoundingClientRect()
    const ptr = pointerFromMouseEvent(e, rect, this.options.getLayout())
    const preview = this.session.update(ptr, this.options.getLayout(), this.options.getMetrics())
    if (!preview) return

    this.setGuide({ active: true, pos: preview.guidePos })
    this.setHint({
      show: true,
      x: e.clientX - vpRect.left + 12,
      y: e.clientY - vpRect.top - 28,
      text: preview.hintText,
    })
  }

  end(e: MouseEvent): void {
    const canvas = this.options.getCanvas()
    document.removeEventListener('mousemove', this.onDocumentMove)
    document.removeEventListener('mouseup', this.onDocumentUp)
    this.setGuide({ ...this.guide, active: false })
    this.setHint({ ...this.hint, show: false })

    const startPt = this.startPointer
    this.startPointer = null

    const s = this.options.getSheet()
    if (!canvas || !s) {
      this.session.cancel()
      if (canvas) canvas.style.cursor = ''
      return
    }

    const rect = canvas.getBoundingClientRect()
    const ptr = pointerFromMouseEvent(e, rect, this.options.getLayout())

    // 检查是否仅为点击（移动距离 < 3px），若是则全选该行
    const dist = startPt ? Math.hypot(e.clientX - startPt.x, e.clientY - startPt.y) : 0
    if (dist < 3) {
      this.session.cancel()
      canvas.style.cursor = ''
      const metrics = this.options.getMetrics()
      const totalCols = metrics.totalCols
      const row = this.startRow
      s.chain()
        .selectRange({
          row: [row, row],
          column: [0, totalCols - 1],
          anchor: { r: row, c: 0 },
        })
        .run()
      this.options.onSelectRange?.(row, 0, row, totalCols - 1, row, 0)
      this.options.onDraw()
      return
    }

    const commit = this.session.commit(
      ptr,
      this.options.getLayout(),
      this.options.getMetrics(),
      s.state.getSelection(),
    )
    canvas.style.cursor = ''
    if (!commit) return

    s.chain()
      .moveRows({
        from: commit.from,
        insertBefore: commit.insertBefore,
        count: commit.count,
      })
      .selectRange(commit.selectionAfter)
      .run()
    this.options.onDraw()
  }

  start(startRow: number, e: MouseEvent): void {
    this.startPointer = { x: e.clientX, y: e.clientY }
    this.startRow = startRow
    const sel = this.options.getSheet()?.state.getSelection() ?? null
    this.session.start(startRow, sel)
    this.updateFromEvent(e)
    document.addEventListener('mousemove', this.onDocumentMove)
    document.addEventListener('mouseup', this.onDocumentUp)
  }

  dispose(): void {
    document.removeEventListener('mousemove', this.onDocumentMove)
    document.removeEventListener('mouseup', this.onDocumentUp)
    this.session.cancel()
    this.startPointer = null
    this.setGuide({ ...this.guide, active: false })
    this.setHint({ ...this.hint, show: false })
  }
}

import {
  ResizeSession,
  pointerFromMouseEvent,
  type GridLayout,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'
import type { CssStyle } from '../types'

export type ResizeGuideState = { active: boolean; axis: 'row' | 'col'; pos: number }

export type ResizeDragOptions = {
  getCanvas: () => HTMLCanvasElement | undefined
  getLayout: () => GridLayout
  getMetrics: () => GridMetrics
  getSheet: () => Sheet | null
  onDraw: () => void
  onGuideChange: (guide: ResizeGuideState) => void
}

export class ResizeDragController {
  private readonly session = new ResizeSession()
  private guide: ResizeGuideState = { active: false, axis: 'row', pos: 0 }
  private readonly onDocumentMove = (e: MouseEvent): void => this.updateFromEvent(e)
  private readonly onDocumentUp = (e: MouseEvent): void => this.end(e)

  constructor(private readonly options: ResizeDragOptions) {}

  getGuideStyle(): CssStyle {
    if (this.guide.axis === 'row') {
      return {
        top: `${this.guide.pos}px`,
        left: '0',
        right: '0',
        height: '1px',
      }
    }
    return {
      left: `${this.guide.pos}px`,
      top: '0',
      bottom: '0',
      width: '1px',
    }
  }

  isActive(): boolean {
    return this.session.active
  }

  private setGuide(guide: ResizeGuideState): void {
    this.guide = guide
    this.options.onGuideChange(guide)
  }

  updateFromEvent(e: MouseEvent): void {
    const canvas = this.options.getCanvas()
    if (!this.session.active || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const ptr = pointerFromMouseEvent(e, rect, this.options.getLayout())
    const preview = this.session.update(ptr, this.options.getLayout(), this.options.getMetrics())
    if (!preview) return
    this.setGuide({
      active: true,
      axis: preview.axis,
      pos: preview.guidePos,
    })
  }

  end(e: MouseEvent): void {
    const canvas = this.options.getCanvas()
    document.removeEventListener('mousemove', this.onDocumentMove)
    document.removeEventListener('mouseup', this.onDocumentUp)
    this.setGuide({ ...this.guide, active: false })

    const s = this.options.getSheet()
    if (!canvas || !s) {
      this.session.cancel()
      if (canvas) canvas.style.cursor = ''
      return
    }

    const rect = canvas.getBoundingClientRect()
    const ptr = pointerFromMouseEvent(e, rect, this.options.getLayout())
    const commit = this.session.commit(
      ptr,
      this.options.getLayout(),
      this.options.getMetrics(),
      s.state.getSelection(),
    )
    canvas.style.cursor = ''
    if (!commit) return

    if (commit.axis === 'row') {
      s.chain()
        .setRowHeight({ row: commit.row, height: commit.height, rows: commit.rows })
        .run()
    } else {
      s.chain()
        .setColWidth({ col: commit.col, width: commit.width, cols: commit.cols })
        .run()
    }
    this.options.onDraw()
  }

  start(axis: 'row' | 'col', index: number, e: MouseEvent): void {
    this.session.start(axis, index)
    this.updateFromEvent(e)
    document.addEventListener('mousemove', this.onDocumentMove)
    document.addEventListener('mouseup', this.onDocumentUp)
  }

  dispose(): void {
    document.removeEventListener('mousemove', this.onDocumentMove)
    document.removeEventListener('mouseup', this.onDocumentUp)
    this.session.cancel()
    this.setGuide({ ...this.guide, active: false })
  }
}

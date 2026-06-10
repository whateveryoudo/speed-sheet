import {
  ColMoveSession,
  pointerFromMouseEvent,
  type GridLayout,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'
import type { MoveGuideState, MoveHintState } from './row-move'

export type ColMoveOptions = {
  getCanvas: () => HTMLCanvasElement | undefined
  getViewport: () => HTMLElement | undefined
  getLayout: () => GridLayout
  getMetrics: () => GridMetrics
  getSheet: () => Sheet | null
  onDraw: () => void
  onGuideChange: (guide: MoveGuideState) => void
  onHintChange: (hint: MoveHintState) => void
}

export class ColMoveController {
  private readonly session = new ColMoveSession()
  private guide: MoveGuideState = { active: false, pos: 0 }
  private hint: MoveHintState = { show: false, x: 0, y: 0, text: '' }
  private readonly onDocumentMove = (e: MouseEvent): void => this.updateFromEvent(e)
  private readonly onDocumentUp = (e: MouseEvent): void => this.end(e)

  constructor(private readonly options: ColMoveOptions) {}

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

    s.chain()
      .moveCols({
        from: commit.from,
        insertBefore: commit.insertBefore,
        count: commit.count,
      })
      .selectRange(commit.selectionAfter)
      .run()
    this.options.onDraw()
  }

  start(startCol: number, e: MouseEvent): void {
    const sel = this.options.getSheet()?.state.getSelection() ?? null
    this.session.start(startCol, sel)
    this.updateFromEvent(e)
    document.addEventListener('mousemove', this.onDocumentMove)
    document.addEventListener('mouseup', this.onDocumentUp)
  }

  dispose(): void {
    document.removeEventListener('mousemove', this.onDocumentMove)
    document.removeEventListener('mouseup', this.onDocumentUp)
    this.session.cancel()
    this.setGuide({ ...this.guide, active: false })
    this.setHint({ ...this.hint, show: false })
  }
}

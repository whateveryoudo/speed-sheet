import { ref, type Ref, type ComputedRef } from 'vue'
import {
  ColMoveSession,
  pointerFromMouseEvent,
  type GridLayout,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'

export function useSheetColMove(options: {
  canvasEl: Ref<HTMLCanvasElement | undefined>
  viewportEl: Ref<HTMLElement | undefined>
  getLayout: () => GridLayout
  getMetrics: ComputedRef<GridMetrics> | Ref<GridMetrics>
  sheet: Ref<Sheet | null>
  onDraw: () => void
}) {
  const session = new ColMoveSession()
  const colMoveGuide = ref({ active: false, pos: 0 })
  const colMoveHint = ref({ show: false, x: 0, y: 0, text: '' })

  function isActive(): boolean {
    return session.active
  }

  function updateFromEvent(e: MouseEvent): void {
    const canvas = options.canvasEl.value
    const viewport = options.viewportEl.value
    if (!session.active || !canvas || !viewport) return

    const rect = canvas.getBoundingClientRect()
    const vpRect = viewport.getBoundingClientRect()
    const ptr = pointerFromMouseEvent(e, rect, options.getLayout())
    const preview = session.update(ptr, options.getLayout(), options.getMetrics.value)
    if (!preview) return

    colMoveGuide.value = { active: true, pos: preview.guidePos }
    colMoveHint.value = {
      show: true,
      x: e.clientX - vpRect.left + 12,
      y: e.clientY - vpRect.top - 28,
      text: preview.hintText,
    }
  }

  function onDocumentMove(e: MouseEvent): void {
    updateFromEvent(e)
  }

  function end(e: MouseEvent): void {
    const canvas = options.canvasEl.value
    document.removeEventListener('mousemove', onDocumentMove)
    document.removeEventListener('mouseup', end)
    colMoveGuide.value.active = false
    colMoveHint.value.show = false

    const s = options.sheet.value
    if (!canvas || !s) {
      session.cancel()
      if (canvas) canvas.style.cursor = ''
      return
    }

    const rect = canvas.getBoundingClientRect()
    const ptr = pointerFromMouseEvent(e, rect, options.getLayout())
    const commit = session.commit(
      ptr,
      options.getLayout(),
      options.getMetrics.value,
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
    options.onDraw()
  }

  function start(startCol: number, e: MouseEvent): void {
    const sel = options.sheet.value?.state.getSelection() ?? null
    session.start(startCol, sel)
    updateFromEvent(e)
    document.addEventListener('mousemove', onDocumentMove)
    document.addEventListener('mouseup', end)
  }

  function dispose(): void {
    document.removeEventListener('mousemove', onDocumentMove)
    document.removeEventListener('mouseup', end)
    session.cancel()
    colMoveGuide.value.active = false
    colMoveHint.value.show = false
  }

  return {
    colMoveGuide,
    colMoveHint,
    isActive,
    start,
    dispose,
  }
}

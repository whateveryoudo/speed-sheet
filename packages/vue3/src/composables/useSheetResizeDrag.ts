import { ref, computed, type Ref, type ComputedRef } from 'vue'
import {
  ResizeSession,
  pointerFromMouseEvent,
  type GridLayout,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'

export function useSheetResizeDrag(options: {
  canvasEl: Ref<HTMLCanvasElement | undefined>
  getLayout: () => GridLayout
  getMetrics: ComputedRef<GridMetrics> | Ref<GridMetrics>
  sheet: Ref<Sheet | null>
  onDraw: () => void
}) {
  const session = new ResizeSession()
  const resizeGuide = ref({ active: false, axis: 'row' as 'row' | 'col', pos: 0 })

  const resizeGuideStyle = computed(() => {
    if (resizeGuide.value.axis === 'row') {
      return {
        top: `${resizeGuide.value.pos}px`,
        left: '0',
        right: '0',
        height: '1px',
      }
    }
    return {
      left: `${resizeGuide.value.pos}px`,
      top: '0',
      bottom: '0',
      width: '1px',
    }
  })

  function isActive(): boolean {
    return session.active
  }

  function updateFromEvent(e: MouseEvent): void {
    const canvas = options.canvasEl.value
    if (!session.active || !canvas) return
    const rect = canvas.getBoundingClientRect()
    const ptr = pointerFromMouseEvent(e, rect, options.getLayout())
    const preview = session.update(ptr, options.getLayout(), options.getMetrics.value)
    if (!preview) return
    resizeGuide.value = {
      active: true,
      axis: preview.axis,
      pos: preview.guidePos,
    }
  }

  function onDocumentMove(e: MouseEvent): void {
    updateFromEvent(e)
  }

  function end(e: MouseEvent): void {
    const canvas = options.canvasEl.value
    document.removeEventListener('mousemove', onDocumentMove)
    document.removeEventListener('mouseup', end)
    resizeGuide.value.active = false

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

    if (commit.axis === 'row') {
      s.chain()
        .setRowHeight({ row: commit.row, height: commit.height, rows: commit.rows })
        .run()
    } else {
      s.chain()
        .setColWidth({ col: commit.col, width: commit.width, cols: commit.cols })
        .run()
    }
    options.onDraw()
  }

  function start(axis: 'row' | 'col', index: number, e: MouseEvent): void {
    session.start(axis, index)
    updateFromEvent(e)
    document.addEventListener('mousemove', onDocumentMove)
    document.addEventListener('mouseup', end)
  }

  function dispose(): void {
    document.removeEventListener('mousemove', onDocumentMove)
    document.removeEventListener('mouseup', end)
    session.cancel()
    resizeGuide.value.active = false
  }

  return {
    resizeGuide,
    resizeGuideStyle,
    isActive,
    start,
    dispose,
  }
}

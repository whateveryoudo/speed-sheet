import { ref, computed, type Ref, type ComputedRef } from 'vue'
import {
  pointerFromMouseEvent,
  resolveContextMenuHit,
  selectRangeFromContextAction,
  cellPointFromMouse,
  type GridLayout,
  type GridMetrics,
  type Sheet,
  type ContextMenuHitResult,
} from '@speed-sheet/core'
import type { ContextMenuState } from '../types/context-menu'

export function useSheetContextMenu(options: {
  canvasEl: Ref<HTMLCanvasElement | undefined>
  getLayout: () => GridLayout
  getMetrics: ComputedRef<GridMetrics> | Ref<GridMetrics>
  getSelection: () => import('@speed-sheet/shared').Selection
  sheet: Ref<Sheet | null>
  onCellClick: (r: number, c: number) => void
  onDraw: () => void
  onContextMenu: (payload: ContextMenuState & { close: () => void }) => void
  endDragSelect?: () => void
}) {
  const ctxMenu = ref<ContextMenuState & { show: boolean }>({
    show: false,
    r: 0,
    c: 0,
    clientX: 0,
    clientY: 0,
    target: 'cell',
  })

  const ctxMenuPayload = computed(() => ({
    r: ctxMenu.value.r,
    c: ctxMenu.value.c,
    clientX: ctxMenu.value.clientX,
    clientY: ctxMenu.value.clientY,
    target: ctxMenu.value.target,
  }))

  function closeCtxMenu(): void {
    ctxMenu.value.show = false
  }

  function applyHit(hit: ContextMenuHitResult): void {
    const metrics = options.getMetrics.value
    const range = selectRangeFromContextAction(
      hit.action,
      metrics.totalRows,
      metrics.totalCols,
    )
    if (range) {
      options.sheet.value
        ?.chain()
        .selectRange(range)
        .run()
      if (hit.action.type === 'select-cell') {
        options.onCellClick(hit.action.r, hit.action.c)
      }
      options.onDraw()
    }
  }

  function resolveHit(e: MouseEvent): ContextMenuHitResult | null {
    const canvas = options.canvasEl.value
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const layout = options.getLayout()
    const metrics = options.getMetrics.value
    const pointer = {
      ...pointerFromMouseEvent(e, rect, layout),
      clientX: e.clientX,
      clientY: e.clientY,
    }
    const cellPoint = cellPointFromMouse(e, rect, layout, metrics)
    return resolveContextMenuHit(
      pointer,
      layout,
      metrics,
      options.getSelection(),
      cellPoint,
    )
  }

  function onContextMenu(e: MouseEvent): void {
    e.preventDefault()
    options.endDragSelect?.()
    const hit = resolveHit(e)
    if (!hit) return
    applyHit(hit)
    ctxMenu.value = { show: true, ...hit }
    options.onContextMenu({ ...hit, close: closeCtxMenu })
  }

  return {
    ctxMenu,
    ctxMenuPayload,
    closeCtxMenu,
    onContextMenu,
  }
}

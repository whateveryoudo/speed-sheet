import {
  pointerFromMouseEvent,
  resolveContextMenuHit,
  selectRangeFromContextAction,
  cellPointFromMouse,
  type GridLayout,
  type GridMetrics,
  type Sheet,
  type ContextMenuHitResult,
  type ContextMenuTarget,
} from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'
import { Subscribable } from '../utils/subscribe'

export type ContextMenuState = {
  show: boolean
  r: number
  c: number
  clientX: number
  clientY: number
  target: ContextMenuTarget
}

export type ContextMenuOptions = {
  getCanvas: () => HTMLCanvasElement | undefined
  isEditable: () => boolean
  getLayout: () => GridLayout
  getMetrics: () => GridMetrics
  getSelection: () => Selection
  getSheet: () => Sheet | null
  onCellClick: (r: number, c: number) => void
  onDraw: () => void
  onContextMenuOpen?: (payload: Omit<ContextMenuState, 'show'> & { close: () => void }) => void
  endDragSelect?: () => void
}

export class ContextMenuController extends Subscribable {
  state: ContextMenuState = {
    show: false,
    r: 0,
    c: 0,
    clientX: 0,
    clientY: 0,
    target: 'cell',
  }

  constructor(private readonly options: ContextMenuOptions) {
    super()
  }

  get payload(): Omit<ContextMenuState, 'show'> {
    const { show: _show, ...rest } = this.state
    return rest
  }

  close(): void {
    this.state.show = false
    this.notify()
  }

  private applyHit(hit: ContextMenuHitResult): void {
    const metrics = this.options.getMetrics()
    const range = selectRangeFromContextAction(
      hit.action,
      metrics.totalRows,
      metrics.totalCols,
    )
    if (range) {
      this.options.getSheet()?.chain().selectRange(range).run()
      if (hit.action.type === 'select-cell') {
        this.options.onCellClick(hit.action.r, hit.action.c)
      }
      this.options.onDraw()
    }
  }

  resolveHit(e: MouseEvent): ContextMenuHitResult | null {
    const canvas = this.options.getCanvas()
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const layout = this.options.getLayout()
    const metrics = this.options.getMetrics()
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
      this.options.getSelection(),
      cellPoint,
    )
  }

  onContextMenu(e: MouseEvent): void {
    e.preventDefault()
    this.options.endDragSelect?.()
    const hit = this.resolveHit(e)
    if (!hit) return
    this.applyHit(hit)
    if (!this.options.isEditable()) return
    this.state = { show: true, ...hit }
    this.notify()
    this.options.onContextMenuOpen?.({ ...hit, close: () => this.close() })
  }
}

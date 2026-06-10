import type { CellAttributes } from '@speed-sheet/shared'
import { Subscribable } from '../utils/subscribe'

export type CellErrorTipState = {
  show: boolean
  x: number
  y: number
  message: string
}

export type CellErrorTipOptions = {
  getViewport: () => HTMLElement | undefined
  getCells: () => Array<{ r: number; c: number; data: CellAttributes }>
  cellPointFromEvent: (e: MouseEvent) => { r: number; c: number } | null
}

export class CellErrorTipController extends Subscribable {
  state: CellErrorTipState = { show: false, x: 0, y: 0, message: '' }

  constructor(private readonly options: CellErrorTipOptions) {
    super()
  }

  hide(): void {
    this.state.show = false
    this.notify()
  }

  updateFromMouseEvent(e: MouseEvent): void {
    const pt = this.options.cellPointFromEvent(e)
    if (!pt) {
      this.hide()
      return
    }
    const cell = this.options.getCells().find((x) => x.r === pt.r && x.c === pt.c)
    const msg = cell?.data?.em
    if (!cell?.data?.ef || !msg) {
      this.hide()
      return
    }
    const viewport = this.options.getViewport()
    if (!viewport) return
    const vpRect = viewport.getBoundingClientRect()
    this.state = {
      show: true,
      x: e.clientX - vpRect.left + 8,
      y: e.clientY - vpRect.top - 36,
      message: msg,
    }
    this.notify()
  }
}

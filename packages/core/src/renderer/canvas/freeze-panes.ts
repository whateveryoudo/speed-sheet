import type { GridLayout } from '../grid-layout'
import type { GridMetrics } from '../grid-metrics'
import { frozenColPixelWidth, frozenRowPixelHeight } from '../../freeze/freeze-utils'

/** 绘制顺序：先 scroll 区，后 frozen 区（盖在上方） */
export type FreezePaneId = 'body' | 'colStrip' | 'rowStrip' | 'corner'

export const FREEZE_PANE_DRAW_ORDER: FreezePaneId[] = [
  'body',
  'colStrip',
  'rowStrip',
  'corner',
]

export function freezeSplits(layout: GridLayout): { xSplit: number; ySplit: number } {
  return {
    xSplit: layout.freeze?.xSplit ?? 0,
    ySplit: layout.freeze?.ySplit ?? 0,
  }
}

export function hasFreezePanes(layout: GridLayout): boolean {
  const { xSplit, ySplit } = freezeSplits(layout)
  return xSplit > 0 || ySplit > 0
}

/** 单元格归属窗格（合并格以锚点 r,c 为准） */
export function cellFreezePane(
  r: number,
  c: number,
  ySplit: number,
  xSplit: number,
): FreezePaneId {
  const frozenRow = ySplit > 0 && r < ySplit
  const frozenCol = xSplit > 0 && c < xSplit
  if (frozenRow && frozenCol) return 'corner'
  if (frozenRow) return 'rowStrip'
  if (frozenCol) return 'colStrip'
  return 'body'
}

export function cellInFreezePane(
  r: number,
  c: number,
  pane: FreezePaneId | 'all',
  layout: GridLayout,
): boolean {
  if (pane === 'all') return true
  const { xSplit, ySplit } = freezeSplits(layout)
  return cellFreezePane(r, c, ySplit, xSplit) === pane
}

export function applyFreezePaneClip(
  ctx: CanvasRenderingContext2D,
  pane: FreezePaneId,
  layout: GridLayout,
  M: GridMetrics,
  vw: number,
  vh: number,
): void {
  const { xSplit, ySplit } = freezeSplits(layout)
  const RHW = layout.rowHeaderWidth
  const CHH = layout.columnHeaderHeight
  const frozenW = xSplit > 0 ? frozenColPixelWidth(M, xSplit) : 0
  const frozenH = ySplit > 0 ? frozenRowPixelHeight(M, ySplit) : 0

  let x = RHW
  let y = CHH
  let w = vw - RHW
  let h = vh - CHH

  switch (pane) {
    case 'corner':
      w = frozenW
      h = frozenH
      break
    case 'rowStrip':
      x = RHW + frozenW
      w = vw - RHW - frozenW
      h = frozenH
      break
    case 'colStrip':
      w = frozenW
      y = CHH + frozenH
      h = vh - CHH - frozenH
      break
    case 'body':
      x = RHW + frozenW
      y = CHH + frozenH
      w = vw - RHW - frozenW
      h = vh - CHH - frozenH
      break
  }

  if (w <= 0 || h <= 0) {
    ctx.beginPath()
    ctx.rect(0, 0, 0, 0)
    ctx.clip()
    return
  }

  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
}

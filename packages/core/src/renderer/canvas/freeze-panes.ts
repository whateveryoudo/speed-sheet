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

export type SelectionSegment = {
  r0: number
  r1: number
  c0: number
  c1: number
  pane: FreezePaneId
}

/** 跨冻结边界时拆成多个矩形，避免选区填充「冻结缝」 */
export function splitSelectionByFreezePanes(
  r0: number,
  r1: number,
  c0: number,
  c1: number,
  layout: GridLayout,
): SelectionSegment[] {
  const { xSplit, ySplit } = freezeSplits(layout)
  const rA = Math.min(r0, r1)
  const rB = Math.max(r0, r1)
  const cA = Math.min(c0, c1)
  const cB = Math.max(c0, c1)

  const rowRanges: { r0: number; r1: number }[] = []
  if (ySplit > 0) {
    if (rA < ySplit) rowRanges.push({ r0: rA, r1: Math.min(rB, ySplit - 1) })
    if (rB >= ySplit) rowRanges.push({ r0: Math.max(rA, ySplit), r1: rB })
  } else {
    rowRanges.push({ r0: rA, r1: rB })
  }

  const colRanges: { c0: number; c1: number }[] = []
  if (xSplit > 0) {
    if (cA < xSplit) colRanges.push({ c0: cA, c1: Math.min(cB, xSplit - 1) })
    if (cB >= xSplit) colRanges.push({ c0: Math.max(cA, xSplit), c1: cB })
  } else {
    colRanges.push({ c0: cA, c1: cB })
  }

  const segments: SelectionSegment[] = []
  for (const rr of rowRanges) {
    for (const cr of colRanges) {
      segments.push({
        r0: rr.r0,
        r1: rr.r1,
        c0: cr.c0,
        c1: cr.c1,
        pane: cellFreezePane(rr.r0, cr.c0, ySplit, xSplit),
      })
    }
  }
  return segments
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

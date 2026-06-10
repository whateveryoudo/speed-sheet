import type { GridLayout } from '../grid-layout'
import { frozenColPixelWidth, frozenRowPixelHeight } from '../../freeze/freeze-utils'
import { resolveMetrics } from '../layout-metrics'

export function drawFreezeSplitLines(
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  M: ReturnType<typeof resolveMetrics>,
  vw: number,
  vh: number,
  RHW: number,
  CHH: number,
): void {
  const xSplit = layout.freeze?.xSplit ?? 0
  const ySplit = layout.freeze?.ySplit ?? 0
  if (xSplit <= 0 && ySplit <= 0) return

  ctx.save()
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 2

  // 水平分割线拉通行头；垂直分割线拉通列头
  if (ySplit > 0 && M.rowHeight(ySplit - 1) > 0) {
    const y = CHH + frozenRowPixelHeight(M, ySplit)
    if (y > CHH && y < vh) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(vw, y + 0.5)
      ctx.stroke()
    }
  }

  if (xSplit > 0 && M.colWidth(xSplit - 1) > 0) {
    const x = RHW + frozenColPixelWidth(M, xSplit)
    if (x > RHW && x < vw) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, vh)
      ctx.stroke()
    }
  }

  ctx.restore()
}

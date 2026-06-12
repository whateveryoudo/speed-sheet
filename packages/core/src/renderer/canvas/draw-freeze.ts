import type { GridLayout } from '../grid-layout'
import { frozenColPixelWidth, frozenRowPixelHeight } from '../../freeze/freeze-utils'
import type { GridMetrics } from '../grid-metrics'
import { resolveMetrics } from '../layout-metrics'

export function freezeSplitY(CHH: number, M: GridMetrics, ySplit: number): number | null {
  if (ySplit <= 0) return null
  return CHH + frozenRowPixelHeight(M, ySplit)
}

export function freezeSplitX(RHW: number, M: GridMetrics, xSplit: number): number | null {
  if (xSplit <= 0) return null
  return RHW + frozenColPixelWidth(M, xSplit)
}

export function isRowFreezeSplitLine(
  y: number,
  CHH: number,
  M: GridMetrics,
  ySplit: number,
): boolean {
  const splitY = freezeSplitY(CHH, M, ySplit)
  return splitY != null && Math.abs(y - splitY) < 0.6
}

export function isColFreezeSplitLine(
  x: number,
  RHW: number,
  M: GridMetrics,
  xSplit: number,
): boolean {
  const splitX = freezeSplitX(RHW, M, xSplit)
  return splitX != null && Math.abs(x - splitX) < 0.6
}

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
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 2

  // 水平分割线拉通行头；垂直分割线拉通列头（最后绘制，避免被表头底色盖住）
  if (ySplit > 0) {
    const y = freezeSplitY(CHH, M, ySplit)
    if (y != null && y >= CHH && y <= vh) {
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(vw, y + 0.5)
      ctx.stroke()
    }
  }

  if (xSplit > 0) {
    const x = freezeSplitX(RHW, M, xSplit)
    if (x != null && x >= RHW && x <= vw) {
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, vh)
      ctx.stroke()
    }
  }

  ctx.restore()
}

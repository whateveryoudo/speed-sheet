import { gridCellX, gridCellY, type RenderEnv } from './render-env'
import { isColFreezeSplitLine, isRowFreezeSplitLine } from './draw-freeze'
import { cellInFreezePane } from './freeze-panes'

/** 单元格区背景 + 网格线（需在 clip 内调用） */
export function drawGrid(env: RenderEnv): void {
  const { ctx, mc, M, layout, vw, vh, RHW, CHH, totalRows, totalCols, sx, sy, rowStart, rowEnd, colStart, colEnd, freezePane } =
    env

  ctx.fillStyle = '#fff'
  ctx.fillRect(RHW, CHH, Math.max(0, vw - RHW), Math.max(0, vh - CHH))

  ctx.strokeStyle = '#d4d4d4'
  ctx.lineWidth = 0.5

  for (let c = colStart; c <= colEnd + 1; c++) {
    const x = c < totalCols ? gridCellX(layout, M, c) : RHW + M.totalWidth - sx
    if (x < RHW - 1 || x > vw + 1) continue
    if (isColFreezeSplitLine(x, RHW, M, layout.freeze?.xSplit ?? 0)) continue
    for (let r = rowStart; r <= rowEnd; r++) {
      if (M.rowHeight(r) <= 0) continue
      if (!cellInFreezePane(r, c, freezePane, layout)) continue
      if (mc.isInternalColLineAtRow(c, r)) continue
      const y0 = gridCellY(layout, M, r)
      const y1 = y0 + M.rowHeight(r)
      if (y1 < CHH || y0 > vh) continue
      ctx.beginPath()
      ctx.moveTo(x + 0.5, Math.max(CHH, y0))
      ctx.lineTo(x + 0.5, Math.min(vh, y1))
      ctx.stroke()
    }
  }

  for (let r = rowStart; r <= rowEnd + 1; r++) {
    const y = r < totalRows ? gridCellY(layout, M, r) : CHH + M.totalHeight - sy
    if (y < CHH - 1 || y > vh + 1) continue
    if (isRowFreezeSplitLine(y, CHH, M, layout.freeze?.ySplit ?? 0)) continue
    for (let c = colStart; c <= colEnd; c++) {
      if (r < totalRows && !cellInFreezePane(r, c, freezePane, layout)) continue
      if (mc.isInternalRowLineAtCol(r, c)) continue
      const x0 = gridCellX(layout, M, c)
      const x1 = x0 + M.colWidth(c)
      if (x1 < RHW || x0 > vw) continue
      ctx.beginPath()
      ctx.moveTo(Math.max(RHW, x0), y + 0.5)
      ctx.lineTo(Math.min(vw, x1), y + 0.5)
      ctx.stroke()
    }
  }
}

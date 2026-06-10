import { selectionBox } from '../layout-metrics'
import { frozenColPixelWidth, frozenRowPixelHeight } from '../../freeze/freeze-utils'
import { colToLetter } from './hit'
import { gridCellX, gridCellY, type RenderEnv } from './render-env'

export function drawColumnHeaders(env: RenderEnv): void {
  const { ctx, M, layout, vw, CHH, colStart, colEnd, totalCols, sx, RHW } = env
  const xSplit = layout.freeze?.xSplit ?? 0
  const frozenW = xSplit > 0 ? frozenColPixelWidth(M, xSplit) : 0

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, vw, CHH)
  ctx.clip()
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, vw, CHH)

  ctx.fillStyle = '#555'
  ctx.font = '11px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const drawColLabels = (c0: number, c1: number, clipLeft: number, clipW: number): void => {
    if (clipW <= 0) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(clipLeft, 0, clipW, CHH)
    ctx.clip()
    for (let c = c0; c <= c1; c++) {
      const left = gridCellX(layout, M, c)
      const cw = M.colWidth(c)
      const cx = left + cw / 2
      if (cx < clipLeft - cw || cx > clipLeft + clipW + cw) continue
      ctx.fillText(colToLetter(c), cx, CHH / 2)
    }
    ctx.strokeStyle = '#c0c0c0'
    ctx.lineWidth = 0.5
    for (let c = c0; c <= c1 + 1; c++) {
      const x = c < totalCols ? gridCellX(layout, M, c) : RHW + M.totalWidth - sx
      if (x < clipLeft - 1 || x > clipLeft + clipW + 1) continue
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, CHH)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (xSplit > 0) {
    drawColLabels(0, xSplit - 1, RHW, frozenW)
    drawColLabels(Math.max(xSplit, colStart), colEnd, RHW + frozenW, vw - RHW - frozenW)
  } else {
    drawColLabels(colStart, colEnd, RHW, vw - RHW)
  }

  ctx.restore()
}

export function drawRowHeaders(env: RenderEnv): void {
  const { ctx, M, layout, vh, RHW, CHH, rowStart, rowEnd, totalRows, sy } = env
  const ySplit = layout.freeze?.ySplit ?? 0
  const frozenH = ySplit > 0 ? frozenRowPixelHeight(M, ySplit) : 0

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, RHW, vh)
  ctx.clip()
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, RHW, vh)

  ctx.font = '11px -apple-system, sans-serif'
  ctx.fillStyle = '#555'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const drawRowLabels = (r0: number, r1: number, clipTop: number, clipH: number): void => {
    if (clipH <= 0) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, clipTop, RHW, clipH)
    ctx.clip()
    for (let r = r0; r <= r1; r++) {
      if (M.rowHeight(r) <= 0) continue
      const top = gridCellY(layout, M, r)
      const cy = top + M.rowHeight(r) / 2
      if (cy < clipTop - M.rowHeight(r) || cy > clipTop + clipH + M.rowHeight(r)) continue
      ctx.fillText(String(r + 1), RHW / 2, cy)
    }
    ctx.strokeStyle = '#c0c0c0'
    ctx.lineWidth = 0.5
    for (let r = r0; r <= r1 + 1; r++) {
      const y = r < totalRows ? gridCellY(layout, M, r) : CHH + M.totalHeight - sy
      if (y < clipTop - 1 || y > clipTop + clipH + 1) continue
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(RHW, y + 0.5)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (ySplit > 0) {
    drawRowLabels(0, ySplit - 1, CHH, frozenH)
    drawRowLabels(Math.max(ySplit, rowStart), rowEnd, CHH + frozenH, vh - CHH - frozenH)
  } else {
    drawRowLabels(rowStart, rowEnd, CHH, vh - CHH)
  }

  ctx.restore()
}

export function drawCornerBox(env: RenderEnv): void {
  const { ctx, RHW, CHH } = env
  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(0, 0, RHW, CHH)
  ctx.strokeStyle = '#c0c0c0'
  ctx.lineWidth = 0.5
  ctx.strokeRect(0, 0, RHW, CHH)
}

/** 表头高亮（行列范围与 Luckysheet selectTitlesMap 一致，含合并区） */
export function drawHeaderHighlight(env: RenderEnv): void {
  const { ctx, mc, M, layout, options, vw, vh, RHW, CHH, totalRows, totalCols, sx, sy } = env
  const { selection } = options

  const headerBounds = mc.displayBounds(selection)
  const hr0 = headerBounds.r0
  const hr1 = headerBounds.r1
  const hc0 = headerBounds.c0
  const hc1 = headerBounds.c1
  const { x: headerX, y: headerY, w: headerW, h: headerH } = selectionBox(
    layout,
    M,
    hr0,
    hc0,
    hr1,
    hc1,
  )
  const colLeft = headerX
  const colRight = headerX + headerW
  const rowTop = headerY
  const rowBottom = headerY + headerH

  const xSplit = layout.freeze?.xSplit ?? 0
  const ySplit = layout.freeze?.ySplit ?? 0
  const frozenW = xSplit > 0 ? frozenColPixelWidth(M, xSplit) : 0
  const frozenH = ySplit > 0 ? frozenRowPixelHeight(M, ySplit) : 0

  ctx.fillStyle = '#E7E9E8'
  for (let c = hc0; c <= hc1; c++) {
    const left = gridCellX(layout, M, c)
    const cw = M.colWidth(c)
    if (left + cw < RHW || left > vw) continue
    ctx.fillRect(left, 0, cw, CHH)
  }
  for (let r = hr0; r <= hr1; r++) {
    if (M.rowHeight(r) <= 0) continue
    const top = gridCellY(layout, M, r)
    const rh = M.rowHeight(r)
    if (top + rh < CHH || top > vh) continue
    ctx.fillRect(0, top, RHW, rh)
  }

  ctx.strokeStyle = '#c0c0c0'
  ctx.lineWidth = 0.5
  for (let c = hc0; c <= hc1 + 1; c++) {
    const x = c < totalCols ? gridCellX(layout, M, c) : RHW + M.totalWidth - sx
    if (x < colLeft - 1 || x > colRight + 1) continue
    if (x < RHW - 1 || x > vw + 1) continue
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, CHH)
    ctx.stroke()
  }
  for (let r = hr0; r <= hr1 + 1; r++) {
    if (r <= hr1 && M.rowHeight(r) <= 0) continue
    const y = r < totalRows ? gridCellY(layout, M, r) : CHH + M.totalHeight - sy
    if (y < rowTop - 1 || y > rowBottom + 1) continue
    if (y < CHH - 1 || y > vh + 1) continue
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(RHW, y + 0.5)
    ctx.stroke()
  }

  ctx.font = '11px -apple-system, sans-serif'
  ctx.fillStyle = '#555'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.strokeStyle = '#1a73e8'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(colLeft + 0.5, CHH)
  ctx.lineTo(colRight, CHH)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(RHW, rowTop + 0.5)
  ctx.lineTo(RHW, rowBottom)
  ctx.stroke()

  for (let c = hc0; c <= hc1; c++) {
    const left = gridCellX(layout, M, c)
    const cx = left + M.colWidth(c) / 2
    const inFrozenCol = xSplit > 0 && c < xSplit
    const colBandOk =
      xSplit <= 0 ||
      (inFrozenCol ? cx >= RHW - M.colWidth(c) && cx <= RHW + frozenW + M.colWidth(c) : cx >= RHW + frozenW - M.colWidth(c) && cx < vw + M.colWidth(c))
    if (colBandOk && cx > RHW - M.colWidth(c) && cx < vw + M.colWidth(c)) {
      ctx.fillStyle = '#555'
      ctx.fillText(colToLetter(c), cx, CHH / 2)
    }
  }
  for (let r = hr0; r <= hr1; r++) {
    if (M.rowHeight(r) <= 0) continue
    const top = gridCellY(layout, M, r)
    const cy = top + M.rowHeight(r) / 2
    const inFrozenRow = ySplit > 0 && r < ySplit
    const rowBandOk =
      ySplit <= 0 ||
      (inFrozenRow ? cy >= CHH - M.rowHeight(r) && cy <= CHH + frozenH + M.rowHeight(r) : cy >= CHH + frozenH - M.rowHeight(r) && cy < vh + M.rowHeight(r))
    if (rowBandOk && cy > CHH - M.rowHeight(r) && cy < vh + M.rowHeight(r)) {
      ctx.fillStyle = '#555'
      ctx.fillText(String(r + 1), RHW / 2, cy)
    }
  }
}

import { isColFreezeSplitLine, isRowFreezeSplitLine } from './draw-freeze'
import { gridCellX, gridCellY, selectionBox } from '../layout-metrics'
import { frozenColPixelWidth, frozenRowPixelHeight } from '../../freeze/freeze-utils'
import { colToLetter } from './hit'
import { hasFreezePanes, splitSelectionByFreezePanes } from './freeze-panes'
import type { RenderEnv } from './render-env'

type RowHeaderBand = { clipTop: number; clipH: number }

function rectsIntersect(aTop: number, aH: number, bTop: number, bH: number): boolean {
  return aTop + aH > bTop && aTop < bTop + bH
}

function clipRect(
  top: number,
  h: number,
  clipTop: number,
  clipH: number,
): { top: number; h: number } | null {
  const t = Math.max(top, clipTop)
  const b = Math.min(top + h, clipTop + clipH)
  if (b <= t) return null
  return { top: t, h: b - t }
}

/** 行号只画在所属窗格 clip 区（冻结行 / 滚动行） */
function rowHeaderBandForRow(
  r: number,
  ySplit: number,
  CHH: number,
  frozenH: number,
  vh: number,
): RowHeaderBand | null {
  if (ySplit <= 0) {
    return { clipTop: CHH, clipH: vh - CHH }
  }
  if (r < ySplit) {
    return { clipTop: CHH, clipH: frozenH }
  }
  return { clipTop: CHH + frozenH, clipH: vh - CHH - frozenH }
}

function rowVisibleInHeaderBand(
  r: number,
  layout: RenderEnv['layout'],
  M: RenderEnv['M'],
  ySplit: number,
  CHH: number,
  frozenH: number,
  vh: number,
): { top: number; rh: number; cy: number; band: RowHeaderBand } | null {
  if (M.rowHeight(r) <= 0) return null
  const band = rowHeaderBandForRow(r, ySplit, CHH, frozenH, vh)
  if (!band || band.clipH <= 0) return null
  const top = gridCellY(layout, M, r)
  const rh = M.rowHeight(r)
  if (!rectsIntersect(top, rh, band.clipTop, band.clipH)) return null
  return { top, rh, cy: top + rh / 2, band }
}

function drawRowHeaderLabel(
  ctx: CanvasRenderingContext2D,
  r: number,
  layout: RenderEnv['layout'],
  M: RenderEnv['M'],
  RHW: number,
  ySplit: number,
  CHH: number,
  frozenH: number,
  vh: number,
): void {
  const vis = rowVisibleInHeaderBand(r, layout, M, ySplit, CHH, frozenH, vh)
  if (!vis) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, vis.band.clipTop, RHW, vis.band.clipH)
  ctx.clip()
  ctx.fillText(String(r + 1), RHW / 2, vis.cy)
  ctx.restore()
}

function fillRowHeaderHighlight(
  ctx: CanvasRenderingContext2D,
  r: number,
  layout: RenderEnv['layout'],
  M: RenderEnv['M'],
  RHW: number,
  ySplit: number,
  CHH: number,
  frozenH: number,
  vh: number,
): void {
  const vis = rowVisibleInHeaderBand(r, layout, M, ySplit, CHH, frozenH, vh)
  if (!vis) return
  const clipped = clipRect(vis.top, vis.rh, vis.band.clipTop, vis.band.clipH)
  if (!clipped) return
  ctx.fillRect(0, clipped.top, RHW, clipped.h)
}

function rowHeaderLineInBand(
  r: number,
  y: number,
  ySplit: number,
  CHH: number,
  frozenH: number,
  vh: number,
): boolean {
  if (y < CHH || y > vh) return false
  const band = rowHeaderBandForRow(r, ySplit, CHH, frozenH, vh)
  if (!band || band.clipH <= 0) return false
  return y > band.clipTop && y < band.clipTop + band.clipH
}

function drawRowHeaderPass(
  env: RenderEnv,
  r0: number,
  r1: number,
  clipTop: number,
  clipH: number,
  rowFilter: (r: number) => boolean,
): void {
  const { ctx, M, layout, RHW, CHH, vh, totalRows } = env
  const ySplit = layout.freeze?.ySplit ?? 0
  const frozenH = ySplit > 0 ? frozenRowPixelHeight(M, ySplit) : 0

  if (clipH <= 0) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, clipTop, RHW, clipH)
  ctx.clip()

  for (let r = r0; r <= r1; r++) {
    if (!rowFilter(r)) continue
    drawRowHeaderLabel(ctx, r, layout, M, RHW, ySplit, CHH, frozenH, vh)
  }

  ctx.strokeStyle = '#c0c0c0'
  ctx.lineWidth = 0.5
  for (let r = r0; r <= r1 + 1; r++) {
    if (r <= r1 && !rowFilter(r)) continue
    const lineRow = r < totalRows ? Math.min(r, r1) : r1
    const y =
      r < totalRows
        ? gridCellY(layout, M, r)
        : gridCellY(layout, M, r1) + M.rowHeight(r1)
    if (!rowHeaderLineInBand(lineRow, y, ySplit, CHH, frozenH, vh)) continue
    if (isRowFreezeSplitLine(y, CHH, M, ySplit)) continue
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(RHW, y + 0.5)
    ctx.stroke()
  }

  ctx.restore()
}

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

  const drawColLabels = (
    c0: number,
    c1: number,
    clipLeft: number,
    clipW: number,
    colFilter: (c: number) => boolean,
  ): void => {
    if (clipW <= 0) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(clipLeft, 0, clipW, CHH)
    ctx.clip()
    for (let c = c0; c <= c1; c++) {
      if (!colFilter(c)) continue
      const left = gridCellX(layout, M, c)
      const cw = M.colWidth(c)
      const cx = left + cw / 2
      if (cx + cw / 2 < clipLeft || cx - cw / 2 > clipLeft + clipW) continue
      ctx.fillText(colToLetter(c), cx, CHH / 2)
    }
    ctx.strokeStyle = '#c0c0c0'
    ctx.lineWidth = 0.5
    for (let c = c0; c <= c1 + 1; c++) {
      const x =
        c < totalCols
          ? gridCellX(layout, M, c)
          : gridCellX(layout, M, c1) + M.colWidth(c1)
      if (x < clipLeft - 1 || x > clipLeft + clipW + 1) continue
      if (isColFreezeSplitLine(x, RHW, M, xSplit)) continue
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, CHH)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (xSplit > 0) {
    drawColLabels(
      Math.max(xSplit, colStart),
      colEnd,
      RHW + frozenW,
      vw - RHW - frozenW,
      (c) => c >= xSplit,
    )
    drawColLabels(0, xSplit - 1, RHW, frozenW, (c) => c < xSplit)
  } else {
    drawColLabels(colStart, colEnd, RHW, vw - RHW, () => true)
  }

  ctx.restore()
}

export function drawRowHeaders(env: RenderEnv): void {
  const { ctx, vh, RHW, CHH, rowStart, rowEnd } = env
  const ySplit = env.layout.freeze?.ySplit ?? 0
  const frozenH = ySplit > 0 ? frozenRowPixelHeight(env.M, ySplit) : 0

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

  if (ySplit > 0) {
    drawRowHeaderPass(
      env,
      Math.max(ySplit, rowStart),
      rowEnd,
      CHH + frozenH,
      vh - CHH - frozenH,
      (r) => r >= ySplit,
    )
    drawRowHeaderPass(env, 0, Math.min(ySplit - 1, rowEnd), CHH, frozenH, (r) => r < ySplit)
  } else {
    drawRowHeaderPass(env, rowStart, rowEnd, CHH, vh - CHH, () => true)
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

  const xSplit = layout.freeze?.xSplit ?? 0
  const ySplit = layout.freeze?.ySplit ?? 0
  const frozenW = xSplit > 0 ? frozenColPixelWidth(M, xSplit) : 0
  const frozenH = ySplit > 0 ? frozenRowPixelHeight(M, ySplit) : 0
  const frozenBandRight = RHW + frozenW

  const segments = hasFreezePanes(layout)
    ? splitSelectionByFreezePanes(hr0, hr1, hc0, hc1, layout)
    : [{ r0: hr0, r1: hr1, c0: hc0, c1: hc1, pane: 'body' as const }]

  ctx.fillStyle = '#E7E9E8'
  for (const seg of segments) {
    for (let c = seg.c0; c <= seg.c1; c++) {
      const left = gridCellX(layout, M, c)
      const cw = M.colWidth(c)
      if (left + cw < RHW || left > vw) continue
      ctx.fillRect(left, 0, cw, CHH)
    }
    for (let r = seg.r0; r <= seg.r1; r++) {
      fillRowHeaderHighlight(ctx, r, layout, M, RHW, ySplit, CHH, frozenH, vh)
    }
  }

  ctx.strokeStyle = '#c0c0c0'
  ctx.lineWidth = 0.5
  for (const seg of segments) {
    const { x: colLeft, w: colW } = selectionBox(layout, M, seg.r0, seg.c0, seg.r1, seg.c1)
    const colRight = colLeft + colW
    const rowTop = gridCellY(layout, M, seg.r0)
    const rowBottom = gridCellY(layout, M, seg.r1) + M.rowHeight(seg.r1)

    for (let c = seg.c0; c <= seg.c1 + 1; c++) {
      const x =
        c < totalCols
          ? gridCellX(layout, M, c)
          : gridCellX(layout, M, seg.c1) + M.colWidth(seg.c1)
      if (x < colLeft - 1 || x > colRight + 1) continue
      if (x < RHW - 1 || x > vw + 1) continue
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, CHH)
      ctx.stroke()
    }
    for (let r = seg.r0; r <= seg.r1 + 1; r++) {
      if (r <= seg.r1 && M.rowHeight(r) <= 0) continue
      const y =
        r < totalRows
          ? gridCellY(layout, M, r)
          : gridCellY(layout, M, seg.r1) + M.rowHeight(seg.r1)
      if (y < rowTop - 1 || y > rowBottom + 1) continue
      const lineRow = r < totalRows ? r : seg.r1
      if (!rowHeaderLineInBand(lineRow, y, ySplit, CHH, frozenH, vh)) continue
      if (isRowFreezeSplitLine(y, CHH, M, ySplit)) continue
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(RHW, y + 0.5)
      ctx.stroke()
    }
  }

  ctx.font = '11px -apple-system, sans-serif'
  ctx.fillStyle = '#555'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const seg of segments) {
    for (let c = seg.c0; c <= seg.c1; c++) {
      const left = gridCellX(layout, M, c)
      const cx = left + M.colWidth(c) / 2
      const inFrozenCol = xSplit > 0 && c < xSplit
      const colBandOk =
        xSplit <= 0 ||
        (inFrozenCol
          ? cx >= RHW - M.colWidth(c) && cx <= frozenBandRight + M.colWidth(c)
          : cx >= frozenBandRight - M.colWidth(c) && cx < vw + M.colWidth(c))
      if (colBandOk && cx > RHW - M.colWidth(c) && cx < vw + M.colWidth(c)) {
        ctx.fillStyle = '#555'
        ctx.fillText(colToLetter(c), cx, CHH / 2)
      }
    }
    for (let r = seg.r0; r <= seg.r1; r++) {
      drawRowHeaderLabel(ctx, r, layout, M, RHW, ySplit, CHH, frozenH, vh)
    }
  }
}

/**
 * 选区表头描边（须在 drawCornerBox 之后调用，避免被角区盖住）。
 * 行头：行号区右缘竖线；列头：选中列范围底部一条横线（与 selectionBox 对齐）。
 */
export function drawHeaderSelectionBorders(env: RenderEnv): void {
  const { ctx, mc, M, layout, options, vw, RHW, CHH } = env
  const { selection } = options

  const headerBounds = mc.displayBounds(selection)
  const segments = hasFreezePanes(layout)
    ? splitSelectionByFreezePanes(
        headerBounds.r0,
        headerBounds.r1,
        headerBounds.c0,
        headerBounds.c1,
        layout,
      )
    : [
        {
          r0: headerBounds.r0,
          r1: headerBounds.r1,
          c0: headerBounds.c0,
          c1: headerBounds.c1,
          pane: 'body' as const,
        },
      ]

  ctx.strokeStyle = '#1a73e8'
  ctx.lineWidth = 1

  for (const seg of segments) {
    const rowTop = gridCellY(layout, M, seg.r0)
    const rowBottom = gridCellY(layout, M, seg.r1) + M.rowHeight(seg.r1)

    if (rowBottom > rowTop) {
      ctx.beginPath()
      ctx.moveTo(RHW + 0.5, rowTop)
      ctx.lineTo(RHW + 0.5, rowBottom)
      ctx.stroke()
    }

    const { x: colLeft, w: colW } = selectionBox(layout, M, seg.r0, seg.c0, seg.r1, seg.c1)
    const colRight = colLeft + colW
    if (colRight > RHW && colLeft < vw) {
      ctx.beginPath()
      ctx.moveTo(colLeft + 0.5, CHH)
      ctx.lineTo(colRight, CHH)
      ctx.stroke()
    }
  }
}

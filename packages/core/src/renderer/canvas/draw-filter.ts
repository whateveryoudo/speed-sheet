import type { GridLayout } from '../grid-layout'
import { gridCellX, gridCellY, resolveMetrics } from '../layout-metrics'

const FILTER_MARKER_PAD = 6
const FILTER_MARKER_LINE_H = 1
const FILTER_MARKER_GAP = 2
const FILTER_MARKER_WIDTHS = [10, 7, 4]

/** 待确认：表头单元格右侧绿色三线 */
function drawCellFilterMarkerPending(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellW: number,
  cellH: number,
): void {
  const blockH =
    FILTER_MARKER_WIDTHS.length * FILTER_MARKER_LINE_H +
    (FILTER_MARKER_WIDTHS.length - 1) * FILTER_MARKER_GAP
  const maxW = Math.max(...FILTER_MARKER_WIDTHS)

  const blockRight = cx + cellW - FILTER_MARKER_PAD
  const blockBottom = cy + cellH - FILTER_MARKER_PAD
  const blockLeft = blockRight - maxW
  let y = blockBottom - blockH
  ctx.save()
  ctx.fillStyle = '#52c41a'
  for (const w of FILTER_MARKER_WIDTHS) {
    const x = blockLeft + (maxW - w) / 2
    ctx.fillRect(x, y, w, FILTER_MARKER_LINE_H)
    y += FILTER_MARKER_LINE_H + FILTER_MARKER_GAP
  }
  ctx.restore()
}

/** 已应用：表头单元格右下角绿色漏斗 */
function drawCellFilterMarkerActive(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellW: number,
  cellH: number,
): void {
  const w = 10
  const h = 10
  const x = cx + cellW - w - FILTER_MARKER_PAD
  const y = cy + cellH - h - FILTER_MARKER_PAD
  ctx.save()
  ctx.fillStyle = '#52c41a'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + w, y)
  ctx.lineTo(x + w * 0.68, y + h * 0.5)
  ctx.lineTo(x + w * 0.68, y + h)
  ctx.lineTo(x + w * 0.32, y + h)
  ctx.lineTo(x + w * 0.32, y + h * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawFilterDataOutline(
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  M: ReturnType<typeof resolveMetrics>,
  view: import('../../Sheet').FilterViewState,
  vw: number,
  vh: number,
  CHH: number,
): void {
  const { columns, markerRow, dataStartRow, dataEndRow, hiddenRows } = view
  if (markerRow == null || !columns.length) return

  let lastVisible = markerRow
  for (let r = dataEndRow; r >= dataStartRow; r--) {
    if (M.rowHeight(r) <= 0 || hiddenRows.has(r)) continue
    lastVisible = r
    break
  }

  const c0 = columns[0]!
  const c1 = columns[columns.length - 1]!
  const x0 = gridCellX(layout, M, c0)
  const y0 = gridCellY(layout, M, markerRow)
  const x1 = gridCellX(layout, M, c1) + M.colWidth(c1)
  const y1 = gridCellY(layout, M, lastVisible) + M.rowHeight(lastVisible)
  if (x1 < 0 || x0 > vw || y1 < CHH || y0 > vh) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, CHH, Math.max(0, vw), Math.max(0, vh - CHH))
  ctx.clip()
  ctx.strokeStyle = '#52c41a'
  ctx.lineWidth = 2
  ctx.strokeRect(
    Math.max(0, x0) + 1,
    Math.max(CHH, y0) + 1,
    Math.max(0, x1 - x0) - 2,
    Math.max(0, y1 - y0) - 2,
  )
  ctx.restore()
}

export function drawFilterMarkersInView(
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  M: ReturnType<typeof resolveMetrics>,
  filterView: import('../../Sheet').FilterViewState | null | undefined,
  rowStart: number,
  rowEnd: number,
  colStart: number,
  colEnd: number,
  vw: number,
  vh: number,
  CHH: number,
): void {
  if (!filterView?.columns.length || filterView.markerRow == null) return
  const markerRow = filterView.markerRow
  if (markerRow < rowStart || markerRow > rowEnd) return
  if (M.rowHeight(markerRow) <= 0) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, CHH, Math.max(0, vw), Math.max(0, vh - CHH))
  ctx.clip()

  const drawMarker = filterView.active
    ? drawCellFilterMarkerActive
    : drawCellFilterMarkerPending

  for (const c of filterView.columns) {
    if (c < colStart || c > colEnd) continue
    const cx = gridCellX(layout, M, c)
    const cy = gridCellY(layout, M, markerRow)
    const cellW = M.colWidth(c)
    const cellH = M.rowHeight(markerRow)
    if (cx + cellW < 0 || cx > vw || cy + cellH < CHH || cy > vh) continue
    drawMarker(ctx, cx, cy, cellW, cellH)
  }

  const isRangeScope = filterView.headerRow != null
  if (isRangeScope || filterView.active) {
    drawFilterDataOutline(ctx, layout, M, filterView, vw, vh, CHH)
  }

  ctx.restore()
}

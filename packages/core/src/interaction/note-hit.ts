import { noteHasContent, type DataVerificationRule } from '@speed-sheet/shared'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import {
  cellInFreezePane,
  type FreezePaneId,
} from '../renderer/canvas/freeze-panes'
import { gridCellX, gridCellY } from '../renderer/layout-metrics'
import type { MergeLookup } from '../merge/layout'

const MARKER_SIZE = 9
/** 角标外侧扩展热区，便于 hover 命中 */
const MARKER_HIT_PAD = 4

function pointInTriangle(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): boolean {
  const sign = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)
  const d1 = sign(px, py, x1, y1, x2, y2)
  const d2 = sign(px, py, x2, y2, x3, y3)
  const d3 = sign(px, py, x3, y3, x1, y1)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

/** 备注角标热区（单元格右上角三角，含扩展 padding） */
export function hitNoteMarkerAt(
  cx: number,
  cy: number,
  r: number,
  c: number,
  layout: GridLayout,
  metrics: GridMetrics,
  rule: DataVerificationRule | null,
): boolean {
  if (rule?.type !== 'note' || !noteHasContent(rule.noteContent)) return false
  const x = gridCellX(layout, metrics, c)
  const y = gridCellY(layout, metrics, r)
  const w = metrics.colWidth(c)
  const markerX = x + w - MARKER_SIZE
  const markerY = y
  const pad = MARKER_HIT_PAD
  if (
    cx < markerX - pad ||
    cy < markerY - pad ||
    cx > markerX + MARKER_SIZE + pad ||
    cy > markerY + MARKER_SIZE + pad
  ) {
    return false
  }
  return pointInTriangle(
    cx,
    cy,
    markerX + MARKER_SIZE,
    markerY,
    markerX + MARKER_SIZE,
    markerY + MARKER_SIZE,
    markerX,
    markerY + MARKER_SIZE,
  )
}

export function drawNoteMarker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellW: number,
): void {
  const x = cx + cellW - MARKER_SIZE
  const y = cy
  ctx.save()
  ctx.fillStyle = '#757575'
  ctx.beginPath()
  ctx.moveTo(x + MARKER_SIZE, y)
  ctx.lineTo(x + MARKER_SIZE, y + MARKER_SIZE)
  ctx.lineTo(x, y)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** 遍历 dataVerification，为可见区内所有备注格绘制角标（含无 celldata 的空格） */
export function drawNoteMarkersInView(
  ctx: CanvasRenderingContext2D,
  layout: GridLayout,
  metrics: GridMetrics,
  mergeLookup: MergeLookup,
  dataVerifications: Map<string, DataVerificationRule> | undefined,
  rowStart: number,
  rowEnd: number,
  colStart: number,
  colEnd: number,
  viewportW: number,
  viewportH: number,
  columnHeaderHeight: number,
  editingCell?: { r: number; c: number },
  freezePane: FreezePaneId | 'all' = 'all',
): void {
  if (!dataVerifications?.size) return
  for (const [key, rule] of dataVerifications) {
    if (rule.type !== 'note' || !noteHasContent(rule.noteContent)) continue
    const [rs, cs] = key.split('_')
    const r = Number(rs)
    const c = Number(cs)
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue
    if (r < rowStart || r > rowEnd || c < colStart || c > colEnd) continue
    if (!cellInFreezePane(r, c, freezePane, layout)) continue
    if (mergeLookup.isSlave(r, c)) continue
    if (editingCell?.r === r && editingCell?.c === c) continue

    const cx = gridCellX(layout, metrics, c)
    const cy = gridCellY(layout, metrics, r)
    const cellW = metrics.colWidth(c)
    const cellH = metrics.rowHeight(r)
    if (cx + cellW < 0 || cx > viewportW || cy + cellH < columnHeaderHeight || cy > viewportH) {
      continue
    }
    drawNoteMarker(ctx, cx, cy, cellW)
  }
}

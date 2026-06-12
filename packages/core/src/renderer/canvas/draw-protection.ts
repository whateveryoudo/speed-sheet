import { cellInFreezePane } from './freeze-panes'
import { gridCellX, gridCellY, type RenderEnv } from './render-env'
import type { ProtectionOverlayEntry } from './types'

/** 与复选框选中态一致（#00b96b），降低透明度作保护 overlay */
const PROTECTION_FILL = 'rgba(0, 185, 107, 0.07)'
const PROTECTION_HATCH = 'rgba(0, 185, 107, 0.16)'

function normalizeEntryBounds(entry: ProtectionOverlayEntry) {
  return {
    r0: Math.min(entry.row[0], entry.row[1]),
    r1: Math.max(entry.row[0], entry.row[1]),
    c0: Math.min(entry.column[0], entry.column[1]),
    c1: Math.max(entry.column[0], entry.column[1]),
  }
}

function drawHatchRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (w <= 0 || h <= 0) return
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()

  ctx.fillStyle = PROTECTION_FILL
  ctx.fillRect(x, y, w, h)

  ctx.strokeStyle = PROTECTION_HATCH
  ctx.lineWidth = 1
  const step = 6
  for (let i = -h; i < w + h; i += step) {
    ctx.beginPath()
    ctx.moveTo(x + i, y)
    ctx.lineTo(x + i + h, y + h)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawProtectionOverlay(
  env: RenderEnv,
  entries: ProtectionOverlayEntry[] | undefined,
): void {
  if (!entries?.length) return

  const {
    ctx,
    layout,
    M,
    rowStart,
    rowEnd,
    colStart,
    colEnd,
    RHW,
    CHH,
    vw,
    vh,
    freezePane,
  } = env

  for (const entry of entries) {
    const { r0, r1, c0, c1 } = normalizeEntryBounds(entry)
    const vr0 = Math.max(r0, rowStart)
    const vr1 = Math.min(r1, rowEnd)
    const vc0 = Math.max(c0, colStart)
    const vc1 = Math.min(c1, colEnd)
    if (vr0 > vr1 || vc0 > vc1) continue

    for (let r = vr0; r <= vr1; r++) {
      if (M.rowHeight(r) <= 0) continue
      for (let c = vc0; c <= vc1; c++) {
        if (!cellInFreezePane(r, c, freezePane, layout)) continue

        const cx = gridCellX(layout, M, c)
        const cy = gridCellY(layout, M, r)
        const cellW = M.colWidth(c)
        const cellH = M.rowHeight(r)
        if (cx + cellW < RHW || cx > vw || cy + cellH < CHH || cy > vh) continue

        const sl = Math.max(RHW, cx)
        const st = Math.max(CHH, cy)
        const sr = Math.min(vw, cx + cellW)
        const sb = Math.min(vh, cy + cellH)
        const sw = sr - sl
        const sh = sb - st
        if (sw <= 0 || sh <= 0) continue
        drawHatchRect(ctx, sl, st, sw, sh)
      }
    }
  }
}

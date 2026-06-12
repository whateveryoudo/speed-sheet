import { gridCellX, gridCellY, type RenderEnv } from './render-env'
import type { CfDataBarRender } from './types'
import { cellInFreezePane } from './freeze-panes'

export function drawConditionalFormatDataBars(env: RenderEnv): void {
  const { ctx, options, mc, mergeLookup, M, layout, vw, vh, freezePane } = env
  const map = options.conditionalFormatDataBars
  if (!map?.size) return

  for (const [key, bar] of map) {
    const [rs, cs] = key.split('_')
    const r = parseInt(rs, 10)
    const c = parseInt(cs, 10)
    if (Number.isNaN(r) || Number.isNaN(c)) continue
    if (M.rowHeight(r) <= 0) continue
    if (!cellInFreezePane(r, c, freezePane, layout)) continue
    if (mergeLookup.isSlave(r, c)) continue

    const merge = mergeLookup.at(r, c)
    const isAnchor = merge != null && merge.r === r && merge.c === c
    const pixel =
      isAnchor && merge
        ? mc.pixelRect(merge, layout, M)
        : {
            x: gridCellX(layout, M, c),
            y: gridCellY(layout, M, r),
            w: M.colWidth(c),
            h: M.rowHeight(r),
          }
    const { x: cx, y: cy, w: cellW, h: cellH } = pixel
    if (cx + cellW < 0 || cx > vw || cy + cellH < 0 || cy > vh) continue

    drawDataBar(ctx, cx, cy, cellW, cellH, bar)
  }
}

function drawDataBar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellW: number,
  cellH: number,
  bar: CfDataBarRender,
): void {
  const pad = 2
  const barH = Math.max(4, Math.min(12, cellH * 0.35))
  const y = cy + cellH - barH - pad
  const maxW = Math.max(0, cellW - pad * 2)
  const w = maxW * bar.ratio
  if (w <= 0) return

  const x = cx + pad
  if (bar.gradient) {
    const g = ctx.createLinearGradient(x, y, x + w, y)
    g.addColorStop(0, bar.color)
    g.addColorStop(1, 'rgba(255,255,255,0.85)')
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = bar.color
  }
  ctx.fillRect(x, y, w, barH)
}

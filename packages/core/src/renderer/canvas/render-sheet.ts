import { drawCells } from './draw-cells'
import { drawSheetImages } from './draw-images'
import { drawFreezeSplitLines } from './draw-freeze'
import {
  applyFreezePaneClip,
  FREEZE_PANE_DRAW_ORDER,
  hasFreezePanes,
} from './freeze-panes'
import { drawGrid } from './draw-grid'
import {
  drawColumnHeaders,
  drawCornerBox,
  drawHeaderHighlight,
  drawHeaderSelectionBorders,
  drawRowHeaders,
} from './draw-headers'
import { drawOverlays, drawSelection, drawSelectionHandle } from './draw-selection'
import { drawProtectionOverlay } from './draw-protection'
import { drawConditionalFormatDataBars } from './draw-conditional-format'
import { createRenderEnv } from './render-env'
import type { RenderOptions } from './types'

export function renderSheet(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions,
): void {
  const env = createRenderEnv(ctx, options)
  const { vw, vh } = env

  ctx.clearRect(0, 0, vw, vh)

  if (hasFreezePanes(env.layout)) {
    for (const pane of FREEZE_PANE_DRAW_ORDER) {
      ctx.save()
      applyFreezePaneClip(ctx, pane, env.layout, env.M, vw, vh)
      const paneEnv = { ...env, freezePane: pane }
      drawGrid(paneEnv)
      drawCells(paneEnv)
      drawConditionalFormatDataBars(paneEnv)
      drawSheetImages(paneEnv)
      drawProtectionOverlay(paneEnv, options.protections)
      ctx.save()
      ctx.beginPath()
      ctx.rect(paneEnv.RHW, paneEnv.CHH, Math.max(0, vw - paneEnv.RHW), Math.max(0, vh - paneEnv.CHH))
      ctx.clip()
      drawSelection(paneEnv)
      drawOverlays(paneEnv)
      ctx.restore()
      ctx.restore()
    }
  } else {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, vw, vh)
    ctx.clip()
    drawGrid(env)
    drawCells(env)
    drawConditionalFormatDataBars(env)
    drawSheetImages(env)
    drawProtectionOverlay(env, options.protections)
    ctx.save()
    ctx.beginPath()
    ctx.rect(env.RHW, env.CHH, Math.max(0, vw - env.RHW), Math.max(0, vh - env.CHH))
    ctx.clip()
    drawSelection(env)
    drawOverlays(env)
    ctx.restore()
    ctx.restore()
  }

  drawColumnHeaders(env)
  drawRowHeaders(env)
  drawHeaderHighlight(env)
  drawCornerBox(env)
  drawHeaderSelectionBorders(env)
  drawFreezeSplitLines(ctx, env.layout, env.M, vw, vh, env.RHW, env.CHH)

  drawSelectionHandle(env)
}

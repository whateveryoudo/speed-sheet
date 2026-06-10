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
  drawRowHeaders,
} from './draw-headers'
import { drawOverlays, drawSelection } from './draw-selection'
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
      drawSheetImages(paneEnv)
      ctx.restore()
    }
  } else {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, vw, vh)
    ctx.clip()
    drawGrid(env)
    drawCells(env)
    drawSheetImages(env)
    ctx.restore()
  }

  drawColumnHeaders(env)
  drawRowHeaders(env)
  drawCornerBox(env)
  drawSelection(env)
  drawOverlays(env)
  drawHeaderHighlight(env)
  drawFreezeSplitLines(ctx, env.layout, env.M, vw, vh, env.RHW, env.CHH)
}

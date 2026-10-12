import type { BorderSegment } from '@speed-sheet/shared'
import { gridCellX, gridCellY, type RenderEnv } from './render-env'
import { cellInFreezePane } from './freeze-panes'

function applyStrokeStyle(ctx: CanvasRenderingContext2D, seg: BorderSegment): void {
  ctx.strokeStyle = seg.color || '#000000'
  const style = seg.style ?? 1

  // style mapping:
  // 1: thin solid (1px)
  // 2: medium solid (2px)
  // 3: dashed (1px, dash [3, 3])
  // 4: dotted (1px, dash [1, 2])
  // 5: thick solid (3px)
  // 8: medium thick (2px)
  if (style === 2 || style === 8) {
    ctx.lineWidth = 2
    ctx.setLineDash([])
  } else if (style === 5) {
    ctx.lineWidth = 3
    ctx.setLineDash([])
  } else if (style === 3 || style === 4) {
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
  } else {
    ctx.lineWidth = 1
    ctx.setLineDash([])
  }
}

export function drawBorders(env: RenderEnv): void {
  const {
    ctx,
    options,
    mc,
    mergeLookup,
    M,
    layout,
    vw,
    vh,
    RHW,
    CHH,
    freezePane,
  } = env

  const borders = options.borders
  if (!borders || !borders.length) return

  ctx.save()

  for (const border of borders) {
    const { row_index: r, col_index: c, l, r: right, t, b } = border
    if (!l && !right && !t && !b) continue
    if (M.rowHeight(r) <= 0 || M.colWidth(c) <= 0) continue
    if (!cellInFreezePane(r, c, freezePane, layout)) continue

    // If cell is part of merge, handle slave vs anchor
    const merge = mergeLookup.at(r, c)
    const isAnchor = merge != null && merge.r === r && merge.c === c
    const isSlave = mergeLookup.isSlave(r, c)

    // Compute bounding box
    let cx: number
    let cy: number
    let cellW: number
    let cellH: number

    if (merge) {
      if (isSlave) {
        // Slaves don't independently draw unless outer edges of merge match
        // In Luckysheet/Excel, merged cell border is defined across the entire merged range.
        // We will draw edges if they correspond to the merge's outermost edge.
        const isMergeLeft = c === merge.c
        const isMergeRight = c === merge.c + merge.cs - 1
        const isMergeTop = r === merge.r
        const isMergeBottom = r === merge.r + merge.rs - 1

        const cellRect = {
          x: gridCellX(layout, M, c),
          y: gridCellY(layout, M, r),
          w: M.colWidth(c),
          h: M.rowHeight(r),
        }

        if (t && isMergeTop) {
          applyStrokeStyle(ctx, t)
          ctx.beginPath()
          ctx.moveTo(cellRect.x, cellRect.y + 0.5)
          ctx.lineTo(cellRect.x + cellRect.w, cellRect.y + 0.5)
          ctx.stroke()
        }
        if (b && isMergeBottom) {
          applyStrokeStyle(ctx, b)
          ctx.beginPath()
          ctx.moveTo(cellRect.x, cellRect.y + cellRect.h - 0.5)
          ctx.lineTo(cellRect.x + cellRect.w, cellRect.y + cellRect.h - 0.5)
          ctx.stroke()
        }
        if (l && isMergeLeft) {
          applyStrokeStyle(ctx, l)
          ctx.beginPath()
          ctx.moveTo(cellRect.x + 0.5, cellRect.y)
          ctx.lineTo(cellRect.x + 0.5, cellRect.y + cellRect.h)
          ctx.stroke()
        }
        if (right && isMergeRight) {
          applyStrokeStyle(ctx, right)
          ctx.beginPath()
          ctx.moveTo(cellRect.x + cellRect.w - 0.5, cellRect.y)
          ctx.lineTo(cellRect.x + cellRect.w - 0.5, cellRect.y + cellRect.h)
          ctx.stroke()
        }
        continue
      } else if (isAnchor) {
        const pixel = mc.pixelRect(merge, layout, M)
        cx = pixel.x
        cy = pixel.y
        cellW = pixel.w
        cellH = pixel.h
      } else {
        cx = gridCellX(layout, M, c)
        cy = gridCellY(layout, M, r)
        cellW = M.colWidth(c)
        cellH = M.rowHeight(r)
      }
    } else {
      cx = gridCellX(layout, M, c)
      cy = gridCellY(layout, M, r)
      cellW = M.colWidth(c)
      cellH = M.rowHeight(r)
    }

    if (cx + cellW < RHW || cx > vw || cy + cellH < CHH || cy > vh) continue

    // Draw Top
    if (t) {
      applyStrokeStyle(ctx, t)
      ctx.beginPath()
      ctx.moveTo(cx, cy + 0.5)
      ctx.lineTo(cx + cellW, cy + 0.5)
      ctx.stroke()
    }

    // Draw Bottom
    if (b) {
      applyStrokeStyle(ctx, b)
      ctx.beginPath()
      ctx.moveTo(cx, cy + cellH - 0.5)
      ctx.lineTo(cx + cellW, cy + cellH - 0.5)
      ctx.stroke()
    }

    // Draw Left
    if (l) {
      applyStrokeStyle(ctx, l)
      ctx.beginPath()
      ctx.moveTo(cx + 0.5, cy)
      ctx.lineTo(cx + 0.5, cy + cellH)
      ctx.stroke()
    }

    // Draw Right
    if (right) {
      applyStrokeStyle(ctx, right)
      ctx.beginPath()
      ctx.moveTo(cx + cellW - 0.5, cy)
      ctx.lineTo(cx + cellW - 0.5, cy + cellH)
      ctx.stroke()
    }
  }

  ctx.restore()
}

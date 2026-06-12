import { CELL_TEXT_PAD_X } from './constants'
import {
  cellDisplayText,
  computeOverflowEndCol,
  drawCellText,
  resolveCellTextDrawMode,
} from './cell-text'
import {
  drawCellCheckbox,
  drawCellDropdown,
  drawFormulaErrorMarker,
} from './draw-cell-content'
import { gridCellX, gridCellY, type RenderEnv } from './render-env'
import { cellInFreezePane } from './freeze-panes'

export function drawCells(env: RenderEnv): void {
  const {
    ctx,
    options,
    mc,
    mergeLookup,
    M,
    layout,
    cellMap,
    vw,
    vh,
    totalCols,
    freezePane,
  } = env
  const { cells, dataVerifications, editingCell, conditionalFormatStyles } = options

  for (const { r, c, data } of cells) {
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

    const cfStyle = conditionalFormatStyles?.get(`${r}_${c}`)
    const cellBg = cfStyle?.bg ?? data.bg
    if (cellBg) {
      ctx.fillStyle = cellBg
      ctx.fillRect(cx, cy, cellW, cellH)
    }

    const cellFc = cfStyle?.fc ?? data.fc
    const cellBl = cfStyle?.bl ?? data.bl
    const cellIt = cfStyle?.it ?? data.it
    let font = `${data.fs ?? 11}px -apple-system, BlinkMacSystemFont, sans-serif`
    if (cellBl) font = `bold ${font}`
    if (cellIt) font = `italic ${font}`
    ctx.font = font
    ctx.fillStyle = cellFc ?? '#333'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'

    const dvKey = `${r}_${c}`
    const dvRule = dataVerifications?.get(dvKey)
    const isEditing = editingCell != null && editingCell.r === r && editingCell.c === c

    if (dvRule?.type === 'checkbox') {
      if (!isEditing) {
        const textStartX = drawCellCheckbox(ctx, cx, cy, cellW, cellH, dvRule)
        const label = cellDisplayText(data)
        if (label) {
          ctx.fillStyle = data.fc ?? '#333'
          const clipW = Math.max(0, cx + cellW - textStartX - CELL_TEXT_PAD_X)
          drawCellText(ctx, label, textStartX, cy, clipW, cellH, {
            colSpan: 1,
            truncate: true,
          })
        }
      }
      continue
    }

    if (dvRule?.type === 'dropdown' && !isEditing) {
      drawCellDropdown(ctx, cx, cy, cellW, cellH, data, dvRule)
      continue
    }

    if (dvRule?.type === 'link' && !isEditing) {
      const text = cellDisplayText(data)
      if (text) {
        ctx.fillStyle = data.fc ?? '#1677ff'
        drawCellText(ctx, text, cx + CELL_TEXT_PAD_X, cy, cellW, cellH, {
          colSpan: 1,
          truncate: true,
        })
      }
      continue
    }

    if (data.att && !isEditing) {
      const label = data.m ?? data.att.fileName ?? '附件'
      const display = `📎 ${label}`
      ctx.fillStyle = data.fc ?? '#1677ff'
      drawCellText(ctx, display, cx + CELL_TEXT_PAD_X, cy, cellW, cellH, {
        colSpan: 1,
        truncate: true,
      })
      continue
    }

    const text = cellDisplayText(data)
    if (!text) continue

    if (isEditing) continue

    const { overflow, truncate } = resolveCellTextDrawMode(data)
    let colSpan = 1
    const useTruncate = truncate

    if (!isAnchor && overflow) {
      const textWidth = ctx.measureText(text).width
      const innerW = cellW - CELL_TEXT_PAD_X * 2
      if (textWidth > innerW) {
        const edc = computeOverflowEndCol(cellMap, r, c, textWidth, cellW, totalCols)
        colSpan = edc - c + 1
      }
    }

    drawCellText(ctx, text, cx, cy, cellW, cellH, {
      colSpan,
      truncate: useTruncate,
    })

    if (data.ef) {
      drawFormulaErrorMarker(ctx, cx, cy)
    }
  }
}

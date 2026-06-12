import { drawNoteMarkersInView } from '../../interaction/note-hit'
import { selectionBox } from '../layout-metrics'
import { drawFilterMarkersInView } from './draw-filter'
import {
  hasFreezePanes,
  splitSelectionByFreezePanes,
  type FreezePaneId,
  type SelectionSegment,
} from './freeze-panes'
import type { RenderEnv } from './render-env'

type PixelRect = { x: number; y: number; w: number; h: number }

function drawSelectionRect(
  ctx: CanvasRenderingContext2D,
  rect: PixelRect,
  opts: {
    fill: boolean
    focusStroke: boolean
    RHW: number
    CHH: number
    vw: number
    vh: number
  },
): void {
  const { x, y, w, h } = rect
  if (w <= 0 || h <= 0) return
  if (x + w <= opts.RHW || x >= opts.vw || y + h <= opts.CHH || y >= opts.vh) return

  const sl = Math.max(opts.RHW, x)
  const st = Math.max(opts.CHH, y)
  const sr = Math.min(opts.vw, x + w)
  const sb = Math.min(opts.vh, y + h)
  const sw = sr - sl
  const sh = sb - st
  if (sw <= 0 || sh <= 0) return

  if (opts.fill) {
    ctx.fillStyle = 'rgba(26,115,232,0.08)'
    ctx.fillRect(sl + 1, st + 1, Math.max(0, sw - 2), Math.max(0, sh - 2))
  }

  const lw = opts.focusStroke ? 2 : 1
  ctx.strokeStyle = '#1a73e8'
  ctx.lineWidth = lw
  ctx.lineJoin = 'miter'
  // 2px 描边中心对齐单元格外缘，盖住网格线（与冻结前一致）
  if (lw === 2) {
    ctx.strokeRect(sl + 1, st + 1, Math.max(0, sw - 2), Math.max(0, sh - 2))
  } else {
    ctx.strokeRect(sl + 0.5, st + 0.5, Math.max(0, sw - 1), Math.max(0, sh - 1))
  }
}

function drawSegmentSelection(
  env: RenderEnv,
  seg: SelectionSegment,
  ar: number,
  ac: number,
  isSelecting: boolean,
  editingCell: { r: number; c: number } | undefined,
): void {
  const { ctx, mc, mergeLookup, M, layout, vw, vh, RHW, CHH } = env
  const { r0, r1, c0, c1 } = seg

  const rangeRect = selectionBox(layout, M, r0, c0, r1, c1)
  const { x: selX, y: selY, w: selW, h: selH } = rangeRect
  if (selX + selW <= RHW || selX >= vw || selY + selH <= CHH || selY >= vh) return

  const focusInSeg = ar >= r0 && ar <= r1 && ac >= c0 && ac <= c1
  const focusRect = focusInSeg ? mc.focusPixelRect(ar, ac, layout, M) : null
  const isMultiCell = r0 !== r1 || c0 !== c1
  const matchingMerge = mc.findMatchingSelection(r0, c0, r1, c1)
  const focusMerge = focusInSeg ? mergeLookup.at(ar, ac) : null
  const isMergedFocus =
    focusMerge != null &&
    focusMerge.r === ar &&
    focusMerge.c === ac &&
    (focusMerge.rs > 1 || focusMerge.cs > 1)
  const unifiedRect = matchingMerge
    ? mc.pixelRect(matchingMerge, layout, M)
    : isMergedFocus && !isMultiCell && focusRect
      ? focusRect
      : null
  const isEditingFocus =
    focusInSeg && editingCell != null && editingCell.r === ar && editingCell.c === ac

  const focusSameAsRange =
    focusRect != null &&
    Math.abs(focusRect.x - selX) < 1 &&
    Math.abs(focusRect.y - selY) < 1 &&
    Math.abs(focusRect.w - selW) < 1 &&
    Math.abs(focusRect.h - selH) < 1

  if (unifiedRect) {
    drawSelectionRect(ctx, unifiedRect, {
      fill: true,
      focusStroke: !isEditingFocus,
      RHW,
      CHH,
      vw,
      vh,
    })
  } else if (isMultiCell) {
    drawSelectionRect(ctx, rangeRect, {
      fill: true,
      focusStroke: false,
      RHW,
      CHH,
      vw,
      vh,
    })
    if ((isMultiCell || isSelecting) && !focusSameAsRange) {
      drawSelectionRect(ctx, rangeRect, {
        fill: false,
        focusStroke: false,
        RHW,
        CHH,
        vw,
        vh,
      })
    }
    if (focusRect && !isEditingFocus) {
      drawSelectionRect(ctx, focusRect, {
        fill: false,
        focusStroke: true,
        RHW,
        CHH,
        vw,
        vh,
      })
    }
  } else if (focusRect) {
    drawSelectionRect(ctx, focusRect, {
      fill: true,
      focusStroke: !isEditingFocus,
      RHW,
      CHH,
      vw,
      vh,
    })
  }

}

/** 填充柄画在 clip 外（避免冻结窗格裁切右下角） */
export function drawSelectionHandle(env: RenderEnv): void {
  const { ctx, mc, M, layout, options, vw, vh, RHW, CHH } = env
  const { selection, editingCell } = options

  const r0 = Math.min(selection.row[0], selection.row[1])
  const r1 = Math.max(selection.row[0], selection.row[1])
  const c0 = Math.min(selection.column[0], selection.column[1])
  const c1 = Math.max(selection.column[0], selection.column[1])
  const ar = selection.anchor?.r ?? r0
  const ac = selection.anchor?.c ?? c0

  if (editingCell != null && editingCell.r === ar && editingCell.c === ac) return

  const matchingMerge = mc.findMatchingSelection(r0, c0, r1, c1)
  const handleRect = matchingMerge
    ? mc.pixelRect(matchingMerge, layout, M)
    : selectionBox(layout, M, r0, c0, r1, c1)

  const hx = handleRect.x + handleRect.w - 5
  const hy = handleRect.y + handleRect.h - 5
  if (hx + 5 <= RHW || hx >= vw || hy + 5 <= CHH || hy >= vh) return

  ctx.fillStyle = '#1a73e8'
  ctx.fillRect(hx, hy, 5, 5)
}

export function drawSelection(env: RenderEnv): void {
  const { layout, options, freezePane } = env
  const { selection, isSelecting = false, editingCell } = options

  const r0 = selection.row[0]
  const r1 = selection.row[1]
  const c0 = selection.column[0]
  const c1 = selection.column[1]
  const ar = selection.anchor?.r ?? r0
  const ac = selection.anchor?.c ?? c0

  const segments = hasFreezePanes(layout)
    ? splitSelectionByFreezePanes(r0, r1, c0, c1, layout)
    : [
        {
          r0: Math.min(r0, r1),
          r1: Math.max(r0, r1),
          c0: Math.min(c0, c1),
          c1: Math.max(c0, c1),
          pane: 'body' as FreezePaneId,
        },
      ]

  for (const seg of segments) {
    if (freezePane !== 'all' && seg.pane !== freezePane) continue
    drawSegmentSelection(env, seg, ar, ac, isSelecting, editingCell)
  }
}

export function drawOverlays(env: RenderEnv): void {
  const {
    ctx,
    mergeLookup,
    M,
    layout,
    options,
    vw,
    vh,
    CHH,
    rowStart,
    rowEnd,
    colStart,
    colEnd,
    freezePane,
  } = env
  const { dataVerifications, editingCell, filterView, formulaRefRanges, clipboardRange } =
    options

  drawNoteMarkersInView(
    ctx,
    layout,
    M,
    mergeLookup,
    dataVerifications,
    rowStart,
    rowEnd,
    colStart,
    colEnd,
    vw,
    vh,
    CHH,
    editingCell ?? undefined,
    freezePane,
  )

  drawFilterMarkersInView(
    ctx,
    layout,
    M,
    filterView,
    rowStart,
    rowEnd,
    colStart,
    colEnd,
    vw,
    vh,
    CHH,
  )

  const drawRangeOverlay = (rr0: number, rr1: number, cc0: number, cc1: number, color: string, dashed: boolean) => {
    const segments = hasFreezePanes(layout)
      ? splitSelectionByFreezePanes(rr0, rr1, cc0, cc1, layout)
      : [
          {
            r0: Math.min(rr0, rr1),
            r1: Math.max(rr0, rr1),
            c0: Math.min(cc0, cc1),
            c1: Math.max(cc0, cc1),
            pane: 'body' as FreezePaneId,
          },
        ]
    for (const seg of segments) {
      if (freezePane !== 'all' && seg.pane !== freezePane) continue
      const { x: rx, y: ry, w: rw, h: rh } = selectionBox(
        layout,
        M,
        seg.r0,
        seg.c0,
        seg.r1,
        seg.c1,
      )
      if (rx + rw <= 0 || rx >= vw || ry + rh <= 0 || ry >= vh) continue
      ctx.save()
      ctx.fillStyle = color
      ctx.globalAlpha = 0.12
      ctx.fillRect(rx + 1, ry + 1, rw - 1, rh - 1)
      ctx.globalAlpha = 1
      ctx.strokeStyle = color
      ctx.lineWidth = dashed ? 1.5 : 1.5
      if (dashed) ctx.setLineDash([4, 3])
      ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1)
      if (dashed) ctx.setLineDash([])
      ctx.restore()
    }
  }

  if (formulaRefRanges?.length) {
    for (const ref of formulaRefRanges) {
      drawRangeOverlay(
        ref.row[0],
        ref.row[1],
        ref.column[0],
        ref.column[1],
        ref.color,
        true,
      )
    }
  }

  if (clipboardRange) {
    drawRangeOverlay(
      clipboardRange.row[0],
      clipboardRange.row[1],
      clipboardRange.column[0],
      clipboardRange.column[1],
      '#1a73e8',
      true,
    )
  }
}

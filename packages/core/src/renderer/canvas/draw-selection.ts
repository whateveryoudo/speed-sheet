import { drawNoteMarkersInView } from '../../interaction/note-hit'
import { selectionBox } from '../layout-metrics'
import { CELL_SELECTION_INSET } from './constants'
import { drawFilterMarkersInView } from './draw-filter'
import type { RenderEnv } from './render-env'

export function drawSelection(env: RenderEnv): void {
  const { ctx, mc, mergeLookup, M, layout, options, vw, vh } = env
  const { selection, isSelecting = false, editingCell } = options

  const r0 = selection.row[0]
  const r1 = selection.row[1]
  const c0 = selection.column[0]
  const c1 = selection.column[1]
  const ar = selection.anchor?.r ?? r0
  const ac = selection.anchor?.c ?? c0
  const rangeRect = selectionBox(layout, M, r0, c0, r1, c1)
  const { x: selX, y: selY, w: selW, h: selH } = rangeRect
  const focusRect = mc.focusPixelRect(ar, ac, layout, M)
  const isMultiCell = r0 !== r1 || c0 !== c1
  const matchingMerge = mc.findMatchingSelection(r0, c0, r1, c1)
  const focusMerge = mergeLookup.at(ar, ac)
  const isMergedFocus =
    focusMerge != null &&
    focusMerge.r === ar &&
    focusMerge.c === ac &&
    (focusMerge.rs > 1 || focusMerge.cs > 1)
  const unifiedRect = matchingMerge
    ? mc.pixelRect(matchingMerge, layout, M)
    : isMergedFocus && !isMultiCell
      ? focusRect
      : null
  const isEditingFocus = editingCell != null && editingCell.r === ar && editingCell.c === ac

  const strokeFocus = (rect: { x: number; y: number; w: number; h: number }) => {
    const ins = CELL_SELECTION_INSET
    ctx.strokeStyle = '#1a73e8'
    ctx.lineWidth = 2
    ctx.strokeRect(rect.x + ins, rect.y + ins, rect.w - ins * 2, rect.h - ins * 2)
  }

  if (selX + selW > 0 && selX < vw && selY + selH > 0 && selY < vh) {
    const drawFill = (rect: { x: number; y: number; w: number; h: number }) => {
      ctx.fillStyle = 'rgba(26,115,232,0.08)'
      ctx.fillRect(rect.x + 1, rect.y + 1, Math.max(0, rect.w - 1), Math.max(0, rect.h - 1))
    }

    const focusSameAsRange =
      Math.abs(focusRect.x - selX) < 1 &&
      Math.abs(focusRect.y - selY) < 1 &&
      Math.abs(focusRect.w - selW) < 1 &&
      Math.abs(focusRect.h - selH) < 1

    if (unifiedRect) {
      drawFill(unifiedRect)
      if (!isEditingFocus) strokeFocus(unifiedRect)
    } else if (isMultiCell) {
      drawFill(rangeRect)
      if ((isMultiCell || isSelecting) && !focusSameAsRange) {
        ctx.strokeStyle = '#1a73e8'
        ctx.lineWidth = 1
        ctx.strokeRect(selX + 0.5, selY + 0.5, selW - 1, selH - 1)
      }
      if (!isEditingFocus) strokeFocus(focusRect)
    } else {
      drawFill(focusRect)
      if (!isEditingFocus) strokeFocus(focusRect)
    }

    const handleRect = unifiedRect ?? (isMultiCell ? rangeRect : focusRect)
    const hx = handleRect.x + handleRect.w - 5
    const hy = handleRect.y + handleRect.h - 5
    if (hx > 0 && hy > 0 && !isSelecting) {
      ctx.fillStyle = '#1a73e8'
      ctx.fillRect(hx, hy, 5, 5)
    }
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

  if (formulaRefRanges?.length) {
    for (const ref of formulaRefRanges) {
      const rr0 = ref.row[0]
      const rr1 = ref.row[1]
      const cc0 = ref.column[0]
      const cc1 = ref.column[1]
      const { x: rx, y: ry, w: rw, h: rh } = selectionBox(layout, M, rr0, cc0, rr1, cc1)
      if (rx + rw <= 0 || rx >= vw || ry + rh <= 0 || ry >= vh) continue
      ctx.save()
      ctx.fillStyle = ref.color
      ctx.globalAlpha = 0.12
      ctx.fillRect(rx + 1, ry + 1, rw - 1, rh - 1)
      ctx.globalAlpha = 1
      ctx.strokeStyle = ref.color
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1)
      ctx.setLineDash([])
      ctx.restore()
    }
  }

  if (clipboardRange) {
    const cr0 = clipboardRange.row[0]
    const cr1 = clipboardRange.row[1]
    const cc0 = clipboardRange.column[0]
    const cc1 = clipboardRange.column[1]
    const { x: clipX, y: clipY, w: clipW, h: clipH } = selectionBox(
      layout,
      M,
      cr0,
      cc0,
      cr1,
      cc1,
    )
    if (clipX + clipW > 0 && clipX < vw && clipY + clipH > 0 && clipY < vh) {
      ctx.save()
      ctx.strokeStyle = '#1a73e8'
      ctx.lineWidth = 1.5
      ctx.setLineDash([5, 3])
      ctx.strokeRect(clipX + 0.5, clipY + 0.5, clipW - 1, clipH - 1)
      ctx.setLineDash([])
      ctx.restore()
    }
  }
}

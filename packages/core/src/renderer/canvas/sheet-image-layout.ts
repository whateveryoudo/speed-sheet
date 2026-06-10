import type { SheetImageItem } from '@speed-sheet/shared'
import type { MergeContext } from '../../merge'
import type { GridLayout } from '../grid-layout'
import type { GridMetrics } from '../grid-metrics'

/** 单元格内边距（与插入时 cellW - 8 一致） */
export const SHEET_IMAGE_CELL_INSET = 2

export interface SheetImageViewportRect {
  left: number
  top: number
  width: number
  height: number
}

export function resolveSheetImageOriginSize(img: SheetImageItem): { width: number; height: number } {
  return {
    width: img.originWidth ?? img.width,
    height: img.originHeight ?? img.height,
  }
}

/** 等比缩放至单元格可用区域 */
export function fitImageToCell(
  originWidth: number,
  originHeight: number,
  cellInnerWidth: number,
  cellInnerHeight: number,
): { width: number; height: number } {
  const maxW = Math.max(24, cellInnerWidth)
  const maxH = Math.max(24, cellInnerHeight)
  if (originWidth <= 0 || originHeight <= 0) {
    return { width: maxW, height: maxH }
  }
  const scale = Math.min(maxW / originWidth, maxH / originHeight)
  return {
    width: Math.max(24, Math.round(originWidth * scale)),
    height: Math.max(24, Math.round(originHeight * scale)),
  }
}

export function computeSheetImageDisplaySize(
  layout: GridLayout,
  M: GridMetrics,
  mc: MergeContext,
  img: SheetImageItem,
): { width: number; height: number } {
  const cell = mc.pixelRectAtCell(img.row, img.col, layout, M)
  const innerW = Math.max(24, cell.w - SHEET_IMAGE_CELL_INSET * 2)
  const innerH = Math.max(24, cell.h - SHEET_IMAGE_CELL_INSET * 2)
  const origin = resolveSheetImageOriginSize(img)
  return fitImageToCell(origin.width, origin.height, innerW, innerH)
}

/** 视口坐标（含冻结/滚动，与 gridCellX/Y 一致） */
export function computeSheetImageViewportRect(
  layout: GridLayout,
  M: GridMetrics,
  mc: MergeContext,
  img: SheetImageItem,
): SheetImageViewportRect {
  const cell = mc.pixelRectAtCell(img.row, img.col, layout, M)
  const { width, height } = computeSheetImageDisplaySize(layout, M, mc, img)
  return {
    left: cell.x + (img.offsetLeft ?? SHEET_IMAGE_CELL_INSET),
    top: cell.y + (img.offsetTop ?? SHEET_IMAGE_CELL_INSET),
    width,
    height,
  }
}

import { cellRect, type GridLayout, type Sheet } from '@speed-sheet/core'
import type { SheetImageItem } from '@speed-sheet/shared'

export interface SheetImageAnchorRect {
  left: number
  top: number
  width: number
  height: number
}

/** 单元格内边距（与插入时 cellW - 8 一致） */
export const SHEET_IMAGE_CELL_INSET = 2

export function resolveSheetImageOriginSize(img: SheetImageItem): { width: number; height: number } {
  return {
    width: img.originWidth ?? img.width,
    height: img.originHeight ?? img.height,
  }
}

/** 等比缩放至单元格可用区域（可放大/缩小，对标语雀/Luckysheet 随行列变化） */
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
  sheet: Sheet,
  layout: GridLayout,
  img: SheetImageItem,
): { width: number; height: number } {
  const mc = sheet.createMergeContext()
  const rect = cellRect(img.row, img.col, layout, mc)
  const innerW = Math.max(24, rect.w - SHEET_IMAGE_CELL_INSET * 2)
  const innerH = Math.max(24, rect.h - SHEET_IMAGE_CELL_INSET * 2)
  const origin = resolveSheetImageOriginSize(img)
  return fitImageToCell(origin.width, origin.height, innerW, innerH)
}

export function computeSheetImageAnchorRect(
  sheet: Sheet,
  layout: GridLayout,
  scrollX: number,
  scrollY: number,
  img: SheetImageItem,
): SheetImageAnchorRect {
  const mc = sheet.createMergeContext()
  const rect = cellRect(img.row, img.col, layout, mc)
  const { width, height } = computeSheetImageDisplaySize(sheet, layout, img)
  return {
    left: rect.x - scrollX + (img.offsetLeft ?? SHEET_IMAGE_CELL_INSET),
    top: rect.y - scrollY + (img.offsetTop ?? SHEET_IMAGE_CELL_INSET),
    width,
    height,
  }
}

export function sheetImageStyleFromAnchor(anchor: SheetImageAnchorRect): Record<string, string> {
  return {
    left: `${anchor.left}px`,
    top: `${anchor.top}px`,
    width: `${anchor.width}px`,
    height: `${anchor.height}px`,
  }
}

/** 选中单元格时气泡锚点：取该格第一张图的展示矩形 */
export function computeCellImageBubbleAnchor(
  sheet: Sheet,
  layout: GridLayout,
  scrollX: number,
  scrollY: number,
  r: number,
  c: number,
): SheetImageAnchorRect | null {
  const img = sheet.state.getImagesAtCell(r, c)[0]
  if (!img) return null
  return computeSheetImageAnchorRect(sheet, layout, scrollX, scrollY, img)
}

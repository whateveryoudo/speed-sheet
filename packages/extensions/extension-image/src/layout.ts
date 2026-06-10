import {
  buildSheetGridMetrics,
  computeSheetImageDisplaySize as coreDisplaySize,
  computeSheetImageViewportRect,
  fitImageToCell,
  resolveSheetImageOriginSize,
  SHEET_IMAGE_CELL_INSET,
  type GridLayout,
  type Sheet,
} from '@speed-sheet/core'
import type { SheetImageItem } from '@speed-sheet/shared'

/** @deprecated 使用 computeSheetImageViewportRect */
export type SheetImageAnchorRect = {
  left: number
  top: number
  width: number
  height: number
}

export {
  fitImageToCell,
  resolveSheetImageOriginSize,
  SHEET_IMAGE_CELL_INSET,
}

export function computeSheetImageDisplaySize(
  sheet: Sheet,
  layout: GridLayout,
  img: SheetImageItem,
): { width: number; height: number } {
  const mc = sheet.createMergeContext()
  const M = buildSheetGridMetrics(sheet, layout)
  return coreDisplaySize(layout, M, mc, img)
}

export function computeSheetImageAnchorRect(
  sheet: Sheet,
  layout: GridLayout,
  _scrollX: number,
  _scrollY: number,
  img: SheetImageItem,
): SheetImageAnchorRect {
  const mc = sheet.createMergeContext()
  const M = buildSheetGridMetrics(sheet, layout)
  return computeSheetImageViewportRect(layout, M, mc, img)
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

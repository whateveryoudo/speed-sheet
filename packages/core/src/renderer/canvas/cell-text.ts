import type { CellAttributes } from '@speed-sheet/shared'
import type { GridLayout } from '../grid-layout'
import { CELL_EDITOR_OUTSET, CELL_TEXT_PAD_X, CELL_TEXT_PAD_Y } from './constants'
import type { CellEntry, CellMap, DrawCellTextOptions } from './types'

export function cellMapKey(r: number, c: number): string {
  return `${r},${c}`
}

export function cellDisplayText(cell: CellAttributes | undefined): string {
  if (!cell) return ''
  const v = cell.m ?? cell.v
  if (v === null || v === undefined) return ''
  return String(v)
}

/** 右侧相邻格是否有可见文本（有文本则阻挡溢出） */
function cellBlocksOverflow(cellMap: CellMap, r: number, c: number): boolean {
  return cellDisplayText(cellMap.get(cellMapKey(r, c))).length > 0
}

export function buildCellMap(cells: CellEntry[]): CellMap {
  const map: CellMap = new Map()
  for (const { r, c, data } of cells) {
    map.set(cellMapKey(r, c), data)
  }
  return map
}

export function cellFontString(data: CellAttributes): string {
  let font = `${data.fs ?? 11}px -apple-system, BlinkMacSystemFont, sans-serif`
  if (data.bl) font = `bold ${font}`
  if (data.it) font = `italic ${font}`
  return font
}

function resolveTextDrawMode(data: CellAttributes): {
  overflow: boolean
  truncate: boolean
} {
  const tb = data.tb
  if (tb === 0) return { overflow: false, truncate: true }
  if (tb === 2) return { overflow: false, truncate: true }
  return { overflow: true, truncate: false }
}

/**
 * 左对齐溢出：向右追溯空单元格，返回可绘制到的最后一列（含自身）。
 */
export function computeOverflowEndCol(
  cellMap: CellMap,
  r: number,
  c: number,
  textWidth: number,
  colW: number,
  totalCols: number,
): number {
  const needed = textWidth + CELL_TEXT_PAD_X * 2
  let totalW = colW
  let edc = c

  while (totalW < needed && edc < totalCols - 1) {
    const next = edc + 1
    if (cellBlocksOverflow(cellMap, r, next)) break
    edc = next
    totalW += colW
  }
  return edc
}

export function resolveCellTextDrawMode(data: CellAttributes): {
  overflow: boolean
  truncate: boolean
} {
  return resolveTextDrawMode(data)
}

/** 文本绘制横向占用的列数（含自身），与 canvas 溢出逻辑一致 */
export function getCellTextColSpan(
  cellMap: CellMap,
  r: number,
  c: number,
  data: CellAttributes,
  layout: Pick<GridLayout, 'defaultColWidth' | 'totalCols'>,
  measureCtx: CanvasRenderingContext2D,
  textOverride?: string,
): number {
  const text = textOverride ?? cellDisplayText(data)
  if (!text) return 1

  measureCtx.font = cellFontString(data)
  const colW = layout.defaultColWidth
  const { overflow } = resolveTextDrawMode(data)
  if (!overflow) return 1

  const textWidth = measureCtx.measureText(text).width
  const innerW = colW - CELL_TEXT_PAD_X * 2
  if (textWidth <= innerW) return 1

  const edc = computeOverflowEndCol(cellMap, r, c, textWidth, colW, layout.totalCols)
  return edc - c + 1
}

/**
 * 内联编辑器宽度：至少盖住整格（含外扩），长文/溢出时随内容变宽。
 */
export function computeEditorWidth(
  measureCtx: CanvasRenderingContext2D,
  text: string,
  data: CellAttributes | undefined,
  colSpan: number,
  layout: Pick<GridLayout, 'defaultColWidth' | 'viewportW'>,
  editorLeft: number,
): number {
  const colW = layout.defaultColWidth
  const o = CELL_EDITOR_OUTSET
  const minW = colW + o * 2
  const spanW = colSpan * colW + o * 2

  measureCtx.font = data
    ? cellFontString(data)
    : '11px -apple-system, BlinkMacSystemFont, sans-serif'
  const textW = measureCtx.measureText(text).width + CELL_TEXT_PAD_X * 2 + o * 2
  const maxW = Math.max(minW, layout.viewportW - editorLeft - 4)
  return Math.min(maxW, Math.max(minW, spanW, textW))
}

/**
 * 将文本截断为适合 maxWidth 的字符串（末尾 …）。
 */
export function truncateTextToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (!text || maxWidth <= 0) return ''
  if (ctx.measureText(text).width <= maxWidth) return text

  const ellipsis = '…'
  if (ctx.measureText(ellipsis).width > maxWidth) return ''

  let end = text.length
  while (
    end > 0 &&
    ctx.measureText(text.slice(0, end) + ellipsis).width > maxWidth
  ) {
    end--
  }
  return end > 0 ? text.slice(0, end) + ellipsis : ellipsis
}

/** Luckysheet / Excel 风格：clip + fillText（可跨列溢出，非压缩） */
export function drawCellText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  colW: number,
  rowH: number,
  options?: DrawCellTextOptions,
): void {
  const content = String(text)
  if (!content) return

  const colSpan = Math.max(1, options?.colSpan ?? 1)
  const truncate = options?.truncate ?? false

  const clipX = cx + CELL_TEXT_PAD_X
  const clipY = cy + CELL_TEXT_PAD_Y
  const clipW = Math.max(0, colW * colSpan - CELL_TEXT_PAD_X * 2)
  const clipH = Math.max(0, rowH - CELL_TEXT_PAD_Y * 2)
  if (clipW <= 0 || clipH <= 0) return

  const display =
    truncate && ctx.measureText(content).width > clipW
      ? truncateTextToWidth(ctx, content, clipW)
      : content

  ctx.save()
  ctx.beginPath()
  ctx.rect(clipX, clipY, clipW, clipH)
  ctx.clip()
  ctx.fillText(display, clipX, cy + rowH / 2)
  ctx.restore()
}

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
  wrap: boolean
} {
  const tb = data.tb
  // tb: 0: 截断 (clip / truncate), 1: 溢出 (overflow), 2: 换行 (wrap)
  // Excel / WPS 规范：未配置 tb 时默认即为 溢出 (overflow)
  if (tb === 0) return { overflow: false, truncate: true, wrap: false }
  if (tb === 2) return { overflow: false, truncate: false, wrap: true }
  return { overflow: true, truncate: false, wrap: false }
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
  colWidthFn?: (col: number) => number,
): number {
  const needed = textWidth + CELL_TEXT_PAD_X * 2
  let totalW = colW
  let edc = c

  while (totalW < needed && edc < totalCols - 1) {
    const next = edc + 1
    if (cellBlocksOverflow(cellMap, r, next)) break
    edc = next
    totalW += colWidthFn ? colWidthFn(next) : colW
  }
  return edc
}

export function resolveCellTextDrawMode(data: CellAttributes): {
  overflow: boolean
  truncate: boolean
  wrap: boolean
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

function wrapTextToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  if (!text || maxWidth <= 0) return []
  const paragraphs = text.split('\n')
  const lines: string[] = []

  for (const para of paragraphs) {
    if (!para) {
      lines.push('')
      continue
    }
    let curLine = ''
    for (const char of para) {
      const testLine = curLine + char
      if (ctx.measureText(testLine).width > maxWidth && curLine.length > 0) {
        lines.push(curLine)
        curLine = char
      } else {
        curLine = testLine
      }
    }
    if (curLine.length > 0) {
      lines.push(curLine)
    }
  }
  return lines
}

/** Luckysheet / Excel 风格：clip + fillText（支持溢出、截断、换行与对齐） */
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
  const totalW = options?.totalWidth != null ? Math.max(colW, options.totalWidth) : colW * colSpan
  const truncate = options?.truncate ?? false
  const isWrap = options?.wrap === 2
  const ht = options?.ht ?? 1 // 0: center, 1: left, 2: right
  const vt = options?.vt ?? 0 // 0: middle, 1: top, 2: bottom
  const fs = options?.fontSize ?? 11
  const lineHeight = Math.round(fs * 1.3)

  const clipX = cx + CELL_TEXT_PAD_X
  const clipY = cy + CELL_TEXT_PAD_Y
  const clipW = Math.max(0, totalW - CELL_TEXT_PAD_X * 2)
  const clipH = Math.max(0, rowH - CELL_TEXT_PAD_Y * 2)
  if (clipW <= 0 || clipH <= 0) return

  ctx.save()
  ctx.beginPath()
  ctx.rect(clipX, clipY, clipW, clipH)
  ctx.clip()

  if (isWrap) {
    const lines = wrapTextToLines(ctx, content, clipW)
    const totalLinesH = lines.length * lineHeight

    let startY: number
    if (vt === 1) {
      // top
      startY = clipY + lineHeight / 2
    } else if (vt === 2) {
      // bottom
      startY = clipY + clipH - totalLinesH + lineHeight / 2
    } else {
      // middle
      startY = clipY + (clipH - totalLinesH) / 2 + lineHeight / 2
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const curY = startY + i * lineHeight
      const lineW = ctx.measureText(line).width

      let drawX = clipX
      if (ht === 0) {
        drawX = clipX + Math.max(0, (clipW - lineW) / 2)
      } else if (ht === 2) {
        drawX = clipX + Math.max(0, clipW - lineW)
      }

      ctx.fillText(line, drawX, curY)

      if (options?.strikethrough && lineW > 0) {
        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = 1
        ctx.beginPath()
        const lineY = Math.round(curY)
        ctx.moveTo(drawX, lineY)
        ctx.lineTo(drawX + lineW, lineY)
        ctx.stroke()
      }

      if (options?.underline && lineW > 0) {
        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = 1
        ctx.beginPath()
        const lineY = Math.round(curY + 7)
        ctx.moveTo(drawX, lineY)
        ctx.lineTo(drawX + lineW, lineY)
        ctx.stroke()
      }
    }
  } else {
    // Single line (clip or overflow)
    // 截断与溢出均直接绘制原文字（由外层的 clipRect 物理裁剪），不添加 "..." 省略号
    const display = content
    const textW = ctx.measureText(display).width

    let drawX = clipX
    if (ht === 0) {
      drawX = clipX + Math.max(0, (clipW - textW) / 2)
    } else if (ht === 2) {
      drawX = clipX + Math.max(0, clipW - textW)
    }

    let drawY = cy + rowH / 2
    if (vt === 1) {
      drawY = clipY + lineHeight / 2
    } else if (vt === 2) {
      drawY = clipY + clipH - lineHeight / 2
    }

    ctx.fillText(display, drawX, drawY)

    if (options?.strikethrough && textW > 0) {
      ctx.strokeStyle = ctx.fillStyle
      ctx.lineWidth = 1
      ctx.beginPath()
      const lineY = Math.round(drawY)
      ctx.moveTo(drawX, lineY)
      ctx.lineTo(drawX + textW, lineY)
      ctx.stroke()
    }

    if (options?.underline && textW > 0) {
      ctx.strokeStyle = ctx.fillStyle
      ctx.lineWidth = 1
      ctx.beginPath()
      const lineY = Math.round(drawY + 7)
      ctx.moveTo(drawX, lineY)
      ctx.lineTo(drawX + textW, lineY)
      ctx.stroke()
    }
  }

  ctx.restore()
}

import type { CellAttributes, Selection } from '@speed-sheet/shared'

export interface GridLayout {
  rowHeaderWidth: number
  columnHeaderHeight: number
  defaultColWidth: number
  defaultRowHeight: number
  totalRows: number
  totalCols: number
  scrollX: number
  scrollY: number
  viewportW: number
  viewportH: number
}

export interface CellEntry {
  r: number
  c: number
  data: CellAttributes
}

export interface RenderOptions {
  layout: GridLayout
  cells: CellEntry[]
  selection: Selection
}

/** Visible row/col index range (inclusive) from scroll + viewport */
export function getVisibleRange(layout: GridLayout): {
  rowStart: number
  rowEnd: number
  colStart: number
  colEnd: number
} {
  const { totalRows, totalCols, rowHeaderWidth: RHW, columnHeaderHeight: CHH, defaultColWidth: colW, defaultRowHeight: rowH, scrollX: sx, scrollY: sy, viewportW: vw, viewportH: vh } = layout

  const colStart = Math.max(0, Math.floor(sx / colW))
  const colEnd = Math.min(totalCols - 1, Math.ceil((sx + Math.max(0, vw - RHW)) / colW))
  const rowStart = Math.max(0, Math.floor(sy / rowH))
  const rowEnd = Math.min(totalRows - 1, Math.ceil((sy + Math.max(0, vh - CHH)) / rowH))

  return { rowStart, rowEnd, colStart, colEnd }
}

export function defaultLayout(overrides?: Partial<GridLayout>): GridLayout {
  return {
    rowHeaderWidth: 46,
    columnHeaderHeight: 20,
    defaultColWidth: 73,
    defaultRowHeight: 19,
    totalRows: 200,
    totalCols: 30,
    scrollX: 0,
    scrollY: 0,
    viewportW: 800,
    viewportH: 600,
    ...overrides,
  }
}

export function renderSheet(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  const { layout, cells, selection } = options
  const { totalRows, totalCols, rowHeaderWidth: RHW, columnHeaderHeight: CHH, defaultColWidth: colW, defaultRowHeight: rowH, scrollX: sx, scrollY: sy } = layout
  const vw = layout.viewportW
  const vh = layout.viewportH

  const { rowStart, rowEnd, colStart, colEnd } = getVisibleRange(layout)

  ctx.clearRect(0, 0, vw, vh)

  // ---- Cell area background + grid lines (clipped to viewport) ----
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, vw, vh)
  ctx.clip()

  ctx.fillStyle = '#fff'
  ctx.fillRect(RHW, CHH, Math.max(0, vw - RHW), Math.max(0, vh - CHH))

  ctx.strokeStyle = '#d4d4d4'
  ctx.lineWidth = 0.5
  for (let c = colStart; c <= colEnd + 1; c++) {
    const x = RHW + c * colW - sx
    if (x < RHW - 1 || x > vw + 1) continue
    ctx.beginPath()
    ctx.moveTo(x + 0.5, CHH)
    ctx.lineTo(x + 0.5, vh)
    ctx.stroke()
  }
  for (let r = rowStart; r <= rowEnd + 1; r++) {
    const y = CHH + r * rowH - sy
    if (y < CHH - 1 || y > vh + 1) continue
    ctx.beginPath()
    ctx.moveTo(RHW, y + 0.5)
    ctx.lineTo(vw, y + 0.5)
    ctx.stroke()
  }

  for (const { r, c, data } of cells) {
    const cx = RHW + c * colW - sx
    const cy = CHH + r * rowH - sy
    if (cx + colW < 0 || cx > vw || cy + rowH < 0 || cy > vh) continue

    if (data.bg) {
      ctx.fillStyle = data.bg
      ctx.fillRect(cx, cy, colW, rowH)
    }

    let font = `${data.fs ?? 11}px -apple-system, BlinkMacSystemFont, sans-serif`
    if (data.bl) font = `bold ${font}`
    if (data.it) font = `italic ${font}`
    ctx.font = font
    ctx.fillStyle = data.fc ?? '#333'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const text = String(data.m ?? data.v ?? '')
    ctx.fillText(text, cx + 4, cy + rowH / 2, colW - 8)
  }
  ctx.restore()

  // ---- Column headers (fixed at top, scroll horizontally) ----
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, vw, CHH)
  ctx.clip()
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, vw, CHH)

  ctx.fillStyle = '#555'
  ctx.font = '11px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let c = colStart; c <= colEnd; c++) {
    const cx = RHW + c * colW - sx + colW / 2
    ctx.fillText(colToLetter(c), cx, CHH / 2)
  }
  ctx.restore()

  // ---- Row headers (fixed at left, scroll vertically) ----
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, RHW, vh)
  ctx.clip()
  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, RHW, vh)

  ctx.font = '11px -apple-system, sans-serif'
  ctx.fillStyle = '#555'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let r = rowStart; r <= rowEnd; r++) {
    const cy = CHH + r * rowH - sy + rowH / 2
    ctx.fillText(String(r + 1), RHW / 2, cy)
  }
  ctx.restore()

  // ---- Corner box ----
  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(0, 0, RHW, CHH)
  ctx.strokeStyle = '#c0c0c0'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, RHW, CHH)

  // ---- Selection ----
  const r0 = selection.row[0], r1 = selection.row[1], c0 = selection.column[0], c1 = selection.column[1]
  const selX = RHW + c0 * colW - sx
  const selY = CHH + r0 * rowH - sy
  const selW = (c1 - c0 + 1) * colW
  const selH = (r1 - r0 + 1) * rowH

  if (selX + selW > 0 && selX < vw && selY + selH > 0 && selY < vh) {
    ctx.fillStyle = 'rgba(26,115,232,0.08)'
    ctx.fillRect(selX + 1, selY + 1, selW - 2, selH - 2)
    ctx.strokeStyle = '#1a73e8'
    ctx.lineWidth = 2
    ctx.strokeRect(selX + 1, selY + 1, selW - 2, selH - 2)

    // Cell handle
    const hx = selX + selW - 5
    const hy = selY + selH - 5
    if (hx > 0 && hy > 0) {
      ctx.fillStyle = '#1a73e8'
      ctx.fillRect(hx, hy, 5, 5)
    }
  }

  // ---- Header highlight ----
  ctx.fillStyle = '#d3e3fd'
  ctx.fillRect(RHW + c0 * colW - sx, 0, selW, CHH)
  ctx.fillRect(0, CHH + r0 * rowH - sy, RHW, selH)

  ctx.fillStyle = '#1a33a0'
  ctx.textAlign = 'center'
  for (let c = c0; c <= c1; c++) {
    const cx = RHW + c * colW - sx + colW / 2
    if (cx > RHW - colW && cx < vw + colW) {
      ctx.fillText(colToLetter(c), cx, CHH / 2)
    }
  }
  for (let r = r0; r <= r1; r++) {
    const cy = CHH + r * rowH - sy + rowH / 2
    if (cy > CHH - rowH && cy < vh + rowH) {
      ctx.fillText(String(r + 1), RHW / 2, cy)
    }
  }
}

export function cellFromPoint(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  layout: GridLayout,
): { r: number; c: number } {
  const x = clientX - canvasRect.left - layout.rowHeaderWidth + layout.scrollX
  const y = clientY - canvasRect.top - layout.columnHeaderHeight + layout.scrollY
  return {
    r: Math.floor(y / layout.defaultRowHeight),
    c: Math.floor(x / layout.defaultColWidth),
  }
}

export function colToLetter(c: number): string {
  let s = ''
  let n = c
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

export function cellRect(r: number, c: number, layout: GridLayout): { x: number; y: number; w: number; h: number } {
  return {
    x: layout.rowHeaderWidth + c * layout.defaultColWidth,
    y: layout.columnHeaderHeight + r * layout.defaultRowHeight,
    w: layout.defaultColWidth,
    h: layout.defaultRowHeight,
  }
}

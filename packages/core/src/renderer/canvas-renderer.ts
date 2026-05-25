import type { CellAttributes, Selection } from "@speed-sheet/shared";

export interface GridLayout {
  rowHeaderWidth: number;
  columnHeaderHeight: number;
  defaultColWidth: number;
  defaultRowHeight: number;
  totalRows: number;
  totalCols: number;
  scrollX: number;
  scrollY: number;
  viewportW: number;
  viewportH: number;
}

export interface CellEntry {
  r: number;
  c: number;
  data: CellAttributes;
}

export interface RenderOptions {
  layout: GridLayout;
  cells: CellEntry[];
  selection: Selection;
  /** 正在拖拽框选（范围细框；锚点仍为粗框） */
  isSelecting?: boolean;
  /** 正在内联编辑的单元格（不再在 canvas 上描活动格边框，避免与 input 双边框） */
  editingCell?: { r: number; c: number };
  /** 复制/剪切后的虚线框区域 */
  clipboardRange?: { row: [number, number]; column: [number, number] } | null;
}

/** Visible row/col index range (inclusive) from scroll + viewport */
export function getVisibleRange(layout: GridLayout): {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
} {
  const {
    totalRows,
    totalCols,
    rowHeaderWidth: RHW,
    columnHeaderHeight: CHH,
    defaultColWidth: colW,
    defaultRowHeight: rowH,
    scrollX: sx,
    scrollY: sy,
    viewportW: vw,
    viewportH: vh,
  } = layout;

  const colStart = Math.max(0, Math.floor(sx / colW));
  const colEnd = Math.min(
    totalCols - 1,
    Math.ceil((sx + Math.max(0, vw - RHW)) / colW),
  );
  const rowStart = Math.max(0, Math.floor(sy / rowH));
  const rowEnd = Math.min(
    totalRows - 1,
    Math.ceil((sy + Math.max(0, vh - CHH)) / rowH),
  );

  return { rowStart, rowEnd, colStart, colEnd };
}

export function defaultLayout(overrides?: Partial<GridLayout>): GridLayout {
  const base: GridLayout = {
    rowHeaderWidth: 46,
    columnHeaderHeight: 25,
    defaultColWidth: 120,
    defaultRowHeight: 25,
    totalRows: 200,
    totalCols: 30,
    scrollX: 0,
    scrollY: 0,
    viewportW: 800,
    viewportH: 600,
  }
  if (!overrides) return base
  const patch = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined),
  ) as Partial<GridLayout>
  return { ...base, ...patch }
}

/** Luckysheet 默认左右内边距（space_width） */
const CELL_TEXT_PAD_X = 4
/** 单元格文本裁剪区内边距（与 draw.js rect + clip 一致） */
const CELL_TEXT_PAD_Y = 1

/** tb: 0=截断 1=溢出 2=换行（换行暂未实现，按单格截断） */
type CellMap = Map<string, CellAttributes>

function cellMapKey(r: number, c: number): string {
  return `${r},${c}`
}

function cellDisplayText(cell: CellAttributes | undefined): string {
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

  const edc = computeOverflowEndCol(
    cellMap,
    r,
    c,
    textWidth,
    colW,
    layout.totalCols,
  )
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

  measureCtx.font = data ? cellFontString(data) : '11px -apple-system, BlinkMacSystemFont, sans-serif'
  const textW = measureCtx.measureText(text).width + CELL_TEXT_PAD_X * 2 + o * 2
  const maxW = Math.max(minW, layout.viewportW - editorLeft - 4)
  return Math.min(maxW, Math.max(minW, spanW, textW))
}

/**
 * 左对齐溢出：向右追溯空单元格，返回可绘制到的最后一列（含自身）。
 * 对齐 Luckysheet getCellOverflowMap + cellOverflow_trace(backward)。
 */
function computeOverflowEndCol(
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

function resolveTextDrawMode(data: CellAttributes): {
  overflow: boolean
  truncate: boolean
} {
  const tb = data.tb
  if (tb === 0) return { overflow: false, truncate: true }
  if (tb === 2) return { overflow: false, truncate: true }
  // tb === 1 或未设置：Excel / 腾讯文档默认溢出
  return { overflow: true, truncate: false }
}

/**
 * 将文本截断为适合 maxWidth 的字符串（末尾 …）。
 * 不用 fillText 的 maxWidth 参数——那会水平压缩字体。
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
  while (end > 0 && ctx.measureText(text.slice(0, end) + ellipsis).width > maxWidth) {
    end--
  }
  return end > 0 ? text.slice(0, end) + ellipsis : ellipsis
}

export interface DrawCellTextOptions {
  /** 横向占用的列数（含当前列），默认 1 */
  colSpan?: number
  /** 超出 clip 宽时是否用省略号截断；默认 false（纯 clip） */
  truncate?: boolean
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

export function renderSheet(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions,
): void {
  const { layout, cells, selection, isSelecting = false, editingCell, clipboardRange } = options;
  const {
    totalRows,
    totalCols,
    rowHeaderWidth: RHW,
    columnHeaderHeight: CHH,
    defaultColWidth: colW,
    defaultRowHeight: rowH,
    scrollX: sx,
    scrollY: sy,
  } = layout;
  const vw = layout.viewportW;
  const vh = layout.viewportH;

  const { rowStart, rowEnd, colStart, colEnd } = getVisibleRange(layout);

  const cellMap: CellMap = buildCellMap(cells)

  ctx.clearRect(0, 0, vw, vh);

  // ---- Cell area background + grid lines (clipped to viewport) ----
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, vw, vh);
  ctx.clip();

  ctx.fillStyle = "#fff";
  ctx.fillRect(RHW, CHH, Math.max(0, vw - RHW), Math.max(0, vh - CHH));

  ctx.strokeStyle = "#d4d4d4";
  ctx.lineWidth = 0.5;
  for (let c = colStart; c <= colEnd + 1; c++) {
    const x = RHW + c * colW - sx;
    if (x < RHW - 1 || x > vw + 1) continue;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, CHH);
    ctx.lineTo(x + 0.5, vh);
    ctx.stroke();
  }
  for (let r = rowStart; r <= rowEnd + 1; r++) {
    const y = CHH + r * rowH - sy;
    if (y < CHH - 1 || y > vh + 1) continue;
    ctx.beginPath();
    ctx.moveTo(RHW, y + 0.5);
    ctx.lineTo(vw, y + 0.5);
    ctx.stroke();
  }

  for (const { r, c, data } of cells) {
    const cx = RHW + c * colW - sx;
    const cy = CHH + r * rowH - sy;
    if (cx + colW < 0 || cx > vw || cy + rowH < 0 || cy > vh) continue;

    if (data.bg) {
      ctx.fillStyle = data.bg;
      ctx.fillRect(cx, cy, colW, rowH);
    }

    let font = `${data.fs ?? 11}px -apple-system, BlinkMacSystemFont, sans-serif`;
    if (data.bl) font = `bold ${font}`;
    if (data.it) font = `italic ${font}`;
    ctx.font = font;
    ctx.fillStyle = data.fc ?? "#333";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const text = cellDisplayText(data);
    if (!text) continue;

    // 内联编辑时由 DOM input 显示文字，canvas 不再绘制（避免重影）
    if (
      editingCell != null &&
      editingCell.r === r &&
      editingCell.c === c
    ) {
      continue;
    }

    const { overflow, truncate } = resolveTextDrawMode(data);
    let colSpan = 1;
    const useTruncate = truncate;

    if (overflow) {
      const textWidth = ctx.measureText(text).width;
      const innerW = colW - CELL_TEXT_PAD_X * 2;
      if (textWidth > innerW) {
        const edc = computeOverflowEndCol(
          cellMap,
          r,
          c,
          textWidth,
          colW,
          totalCols,
        );
        colSpan = edc - c + 1;
      }
    }

    drawCellText(ctx, text, cx, cy, colW, rowH, {
      colSpan,
      truncate: useTruncate,
    });
  }
  ctx.restore();

  // ---- Column headers (fixed at top, scroll horizontally) ----
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, vw, CHH);
  ctx.clip();
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, vw, CHH);

  ctx.fillStyle = "#555";
  ctx.font = "11px -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.strokeStyle = "#c0c0c0";
  ctx.lineWidth = 0.5;
  for (let c = colStart; c <= colEnd; c++) {
    const left = RHW + c * colW - sx;
    const cx = left + colW / 2;
    ctx.fillText(colToLetter(c), cx, CHH / 2);
  }

  for (let c = colStart; c <= colEnd + 1; c++) {
    const x = RHW + c * colW - sx;
    if (x < RHW - 1 || x > vw + 1) continue;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, CHH);
    ctx.stroke();
  }

  ctx.restore();

  // ---- Row headers (fixed at left, scroll vertically) ----
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, RHW, vh);
  ctx.clip();
  ctx.fillStyle = "#f0f0f0";
  ctx.fillRect(0, 0, RHW, vh);

  ctx.font = "11px -apple-system, sans-serif";
  ctx.fillStyle = "#555";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let r = rowStart; r <= rowEnd; r++) {
    const cy = CHH + r * rowH - sy + rowH / 2;
    ctx.fillText(String(r + 1), RHW / 2, cy);
  }
  ctx.restore();

  // ---- Corner box ----
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(0, 0, RHW, CHH);
  ctx.strokeStyle = "#c0c0c0";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(0, 0, RHW, CHH);

  // ---- Selection ----
  const r0 = selection.row[0],
    r1 = selection.row[1],
    c0 = selection.column[0],
    c1 = selection.column[1];
  const ar = selection.anchor?.r ?? r0;
  const ac = selection.anchor?.c ?? c0;
  const selX = RHW + c0 * colW - sx;
  const selY = CHH + r0 * rowH - sy;
  const selW = (c1 - c0 + 1) * colW;
  const selH = (r1 - r0 + 1) * rowH;
  const isMultiCell = r0 !== r1 || c0 !== c1;

  if (selX + selW > 0 && selX < vw && selY + selH > 0 && selY < vh) {
    // 范围浅底：按格填充，避免盖住网格线
    ctx.fillStyle = "rgba(26,115,232,0.08)";
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cx = RHW + c * colW - sx;
        const cy = CHH + r * rowH - sy;
        if (cx + colW < RHW || cx > vw || cy + rowH < CHH || cy > vh) continue;
        ctx.fillRect(cx + 1, cy + 1, colW - 1, rowH - 1);
      }
    }
    // 这里暂时不用再绘制一遍网格线（rect会有收缩）
    // ctx.strokeStyle = "#d4d4d4";
    // ctx.lineWidth = 0.5;
    // for (let c = c0; c <= c1 + 1; c++) {
    //   const x = RHW + c * colW - sx;
    //   if (x < selX - 1 || x > selX + selW + 1) continue;
    //   if (x < RHW - 1 || x > vw + 1) continue;
    //   ctx.beginPath();
    //   ctx.moveTo(x + 0.5, Math.max(CHH, selY));
    //   ctx.lineTo(x + 0.5, Math.min(vh, selY + selH));
    //   ctx.stroke();
    // }
    // for (let r = r0; r <= r1 + 1; r++) {
    //   const y = CHH + r * rowH - sy;
    //   if (y < selY - 1 || y > selY + selH + 1) continue;
    //   if (y < CHH - 1 || y > vh + 1) continue;
    //   ctx.beginPath();
    //   ctx.moveTo(Math.max(RHW, selX), y + 0.5);
    //   ctx.lineTo(Math.min(vw, selX + selW), y + 0.5);
    //   ctx.stroke();
    // }

    // 范围外框：多选 / 拖拽时为细实线
    if (isMultiCell || isSelecting) {
      ctx.strokeStyle = "#1a73e8";
      ctx.lineWidth = 1;
      ctx.strokeRect(selX + 0.5, selY + 0.5, selW - 1, selH - 1);
    }

    // 锚点单元格粗框（内联编辑时由 DOM input 画边框，此处跳过）
    const ax = RHW + ac * colW - sx;
    const ay = CHH + ar * rowH - sy;
    const isEditingAnchor =
      editingCell != null && editingCell.r === ar && editingCell.c === ac;
    if (
      !isEditingAnchor &&
      ax + colW > RHW &&
      ax < vw &&
      ay + rowH > CHH &&
      ay < vh
    ) {
      ctx.strokeStyle = "#1a73e8";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        ax + CELL_SELECTION_INSET,
        ay + CELL_SELECTION_INSET,
        colW - CELL_SELECTION_INSET * 2,
        rowH - CELL_SELECTION_INSET * 2,
      );
    }

    // 填充手柄（范围右下角）
    const hx = selX + selW - 5;
    const hy = selY + selH - 5;
    if (hx > 0 && hy > 0 && !isSelecting) {
      ctx.fillStyle = "#1a73e8";
      ctx.fillRect(hx, hy, 5, 5);
    }
  }

  // ---- 复制/剪切虚线框 ----
  if (clipboardRange) {
    const cr0 = clipboardRange.row[0];
    const cr1 = clipboardRange.row[1];
    const cc0 = clipboardRange.column[0];
    const cc1 = clipboardRange.column[1];
    const clipX = RHW + cc0 * colW - sx;
    const clipY = CHH + cr0 * rowH - sy;
    const clipW = (cc1 - cc0 + 1) * colW;
    const clipH = (cr1 - cr0 + 1) * rowH;
    if (clipX + clipW > 0 && clipX < vw && clipY + clipH > 0 && clipY < vh) {
      ctx.save();
      ctx.strokeStyle = "#1a73e8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.strokeRect(clipX + 0.5, clipY + 0.5, clipW - 1, clipH - 1);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // ---- Header highlight ----
  const colLeft = RHW + c0 * colW - sx;
  const colRight = colLeft + selW;
  const rowTop = CHH + r0 * rowH - sy;
  const rowBottom = rowTop + selH;

  ctx.fillStyle = "#E7E9E8";
  for (let c = c0; c <= c1; c++) {
    const left = RHW + c * colW - sx;
    if (left + colW < RHW || left > vw) continue;
    ctx.fillRect(left, 0, colW, CHH);
  }
  for (let r = r0; r <= r1; r++) {
    const top = CHH + r * rowH - sy;
    if (top + rowH < CHH || top > vh) continue;
    ctx.fillRect(0, top, RHW, rowH);
  }

  // 表头内竖线 / 横线（铺底后再画，避免 F|G 之间线消失）
  ctx.strokeStyle = "#c0c0c0";
  ctx.lineWidth = 0.5;
  for (let c = c0; c <= c1 + 1; c++) {
    const x = RHW + c * colW - sx;
    if (x < colLeft - 1 || x > colRight + 1) continue;
    if (x < RHW - 1 || x > vw + 1) continue;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, CHH);
    ctx.stroke();
  }
  for (let r = r0; r <= r1 + 1; r++) {
    const y = CHH + r * rowH - sy;
    if (y < rowTop - 1 || y > rowBottom + 1) continue;
    if (y < CHH - 1 || y > vh + 1) continue;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(RHW, y + 0.5);
    ctx.stroke();
  }

  ctx.font = "11px -apple-system, sans-serif";
  ctx.fillStyle = "#555";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 表头选中边：线宽与网格一致，仅改颜色
  ctx.strokeStyle = "#1a73e8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(colLeft + 0.5, CHH);
  ctx.lineTo(colRight, CHH);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(RHW, rowTop + 0.5);
  ctx.lineTo(RHW, rowBottom);
  ctx.stroke();

  for (let c = c0; c <= c1; c++) {
    const cx = RHW + c * colW - sx + colW / 2;
    if (cx > RHW - colW && cx < vw + colW) {
      ctx.fillStyle = "#555";
      ctx.fillText(colToLetter(c), cx, CHH / 2);
    }
  }
  for (let r = r0; r <= r1; r++) {
    const cy = CHH + r * rowH - sy + rowH / 2;
    if (cy > CHH - rowH && cy < vh + rowH) {
      ctx.fillStyle = "#555";
      ctx.fillText(String(r + 1), RHW / 2, cy);
    }
  }
}

export function cellFromPoint(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  layout: GridLayout,
): { r: number; c: number } {
  const x = clientX - canvasRect.left - layout.rowHeaderWidth + layout.scrollX;
  const y =
    clientY - canvasRect.top - layout.columnHeaderHeight + layout.scrollY;
  return {
    r: Math.floor(y / layout.defaultRowHeight),
    c: Math.floor(x / layout.defaultColWidth),
  };
}

export function colToLetter(c: number): string {
  let s = "";
  let n = c;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

export const CELL_SELECTION_INSET = 1;
/** 内联 editor 相对单元格的外扩（盖住网格线 / 选区描边，避免 canvas 侧特殊处理） */
export const CELL_EDITOR_OUTSET = 2;

export function cellRect(
  r: number,
  c: number,
  layout: GridLayout,
): { x: number; y: number; w: number; h: number } {
  return {
    x: layout.rowHeaderWidth + c * layout.defaultColWidth,
    y: layout.columnHeaderHeight + r * layout.defaultRowHeight,
    w: layout.defaultColWidth,
    h: layout.defaultRowHeight,
  };
}

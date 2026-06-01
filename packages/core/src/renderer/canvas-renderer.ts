import type {
  CellAttributes,
  DataVerificationRule,
  MergeRange,
  Selection,
} from "@speed-sheet/shared";
import { MergeContext } from "../merge";
import { getVisibleRangeFromMetrics } from "./grid-metrics";
import {
  gridCellX,
  gridCellY,
  resolveMetrics,
  selectionBox,
} from "./layout-metrics";
export type { GridLayout } from "./grid-layout";
import type { GridLayout } from "./grid-layout";

export interface CellEntry {
  r: number;
  c: number;
  data: CellAttributes;
}

export interface RenderOptions {
  layout: GridLayout;
  cells: CellEntry[];
  /** @deprecated 使用 mergeCtx */
  merges?: MergeRange[];
  /** 合并门面（优先于 merges） */
  mergeCtx?: MergeContext;
  selection: Selection;
  /** 正在拖拽框选（范围细框；锚点仍为粗框） */
  isSelecting?: boolean;
  /** 正在内联编辑的单元格（不再在 canvas 上描活动格边框，避免与 input 双边框） */
  editingCell?: { r: number; c: number };
  /** 复制/剪切后的虚线框区域 */
  clipboardRange?: { row: [number, number]; column: [number, number] } | null;
  /** 公式编辑时引用的单元格/区域（虚线框，按 color 区分） */
  formulaRefRanges?: Array<{
    row: [number, number];
    column: [number, number];
    color: string;
  }>;
  /** 数据验证（复选框等），键 `row_col` */
  dataVerifications?: Map<string, DataVerificationRule>;
}

const CHECKBOX_SIZE = 14;
const CHECKBOX_GAP = 6;
const DROPDOWN_ARROW_W = 14;

/** 在单元格内绘制复选框（Canvas；状态来自 dataVerification.checked） */
export function drawCellCheckbox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellW: number,
  cellH: number,
  rule: DataVerificationRule,
): number {
  const size = CHECKBOX_SIZE;
  const boxX = cx + CELL_TEXT_PAD_X;
  const boxY = cy + (cellH - size) / 2;
  const checked = !!rule.checked;

  ctx.save();
  if (checked) {
    ctx.fillStyle = "#00b96b";
    ctx.strokeStyle = "#00b96b";
    roundRect(ctx, boxX, boxY, size, size, 3);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(boxX + 3, boxY + size / 2);
    ctx.lineTo(boxX + size / 2 - 0.5, boxY + size - 4);
    ctx.lineTo(boxX + size - 3, boxY + 3);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#bfbfbf";
    ctx.lineWidth = 1.5;
    roundRect(ctx, boxX, boxY, size, size, 3);
    ctx.stroke();
  }
  ctx.restore();
  return boxX + size + CHECKBOX_GAP;
}

function dropdownDisplayText(
  data: CellAttributes,
  rule: DataVerificationRule,
): string {
  const fromRule = rule.value
  if (fromRule != null && fromRule !== '') {
    return Array.isArray(fromRule) ? fromRule.join(', ') : String(fromRule)
  }
  return cellDisplayText(data)
}

/** 下拉列表：文本 + 右侧三角 */
export function drawCellDropdown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellW: number,
  cellH: number,
  data: CellAttributes,
  rule: DataVerificationRule,
): void {
  const padX = CELL_TEXT_PAD_X
  const arrowX = cx + cellW - padX - DROPDOWN_ARROW_W
  const text = dropdownDisplayText(data, rule)
  const textW = Math.max(0, arrowX - (cx + padX) - 4)

  if (text) {
    ctx.fillStyle = data.fc ?? '#333'
    drawCellText(ctx, text, cx + padX, cy, textW, cellH, {
      colSpan: 1,
      truncate: true,
    })
  }

  const midY = cy + cellH / 2
  ctx.save()
  ctx.fillStyle = '#8c8c8c'
  ctx.beginPath()
  const ax = arrowX + DROPDOWN_ARROW_W / 2
  ctx.moveTo(ax - 4, midY - 2)
  ctx.lineTo(ax + 4, midY - 2)
  ctx.lineTo(ax, midY + 3)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Visible row/col index range (inclusive) from scroll + viewport */
export function getVisibleRange(layout: GridLayout): {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
} {
  return getVisibleRangeFromMetrics(resolveMetrics(layout), layout);
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
  };
  if (!overrides) return base;
  const patch = Object.fromEntries(
    Object.entries(overrides).filter(([, v]) => v !== undefined),
  ) as Partial<GridLayout>;
  return { ...base, ...patch };
}

/** Luckysheet 默认左右内边距（space_width） */
const CELL_TEXT_PAD_X = 4;
/** 单元格文本裁剪区内边距（与 draw.js rect + clip 一致） */
const CELL_TEXT_PAD_Y = 1;

/** tb: 0=截断 1=溢出 2=换行（换行暂未实现，按单格截断） */
type CellMap = Map<string, CellAttributes>;

function cellMapKey(r: number, c: number): string {
  return `${r},${c}`;
}

function cellDisplayText(cell: CellAttributes | undefined): string {
  if (!cell) return "";
  const v = cell.m ?? cell.v;
  if (v === null || v === undefined) return "";
  return String(v);
}

/** 公式错误角标（左上红色三角，对齐 Excel） */
function drawFormulaErrorMarker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  ctx.save();
  ctx.fillStyle = "#e74c3c";
  ctx.beginPath();
  ctx.moveTo(cx + 1, cy + 1);
  ctx.lineTo(cx + 7, cy + 1);
  ctx.lineTo(cx + 1, cy + 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** 右侧相邻格是否有可见文本（有文本则阻挡溢出） */
function cellBlocksOverflow(cellMap: CellMap, r: number, c: number): boolean {
  return cellDisplayText(cellMap.get(cellMapKey(r, c))).length > 0;
}

export function buildCellMap(cells: CellEntry[]): CellMap {
  const map: CellMap = new Map();
  for (const { r, c, data } of cells) {
    map.set(cellMapKey(r, c), data);
  }
  return map;
}

export function cellFontString(data: CellAttributes): string {
  let font = `${data.fs ?? 11}px -apple-system, BlinkMacSystemFont, sans-serif`;
  if (data.bl) font = `bold ${font}`;
  if (data.it) font = `italic ${font}`;
  return font;
}

/** 文本绘制横向占用的列数（含自身），与 canvas 溢出逻辑一致 */
export function getCellTextColSpan(
  cellMap: CellMap,
  r: number,
  c: number,
  data: CellAttributes,
  layout: Pick<GridLayout, "defaultColWidth" | "totalCols">,
  measureCtx: CanvasRenderingContext2D,
  textOverride?: string,
): number {
  const text = textOverride ?? cellDisplayText(data);
  if (!text) return 1;

  measureCtx.font = cellFontString(data);
  const colW = layout.defaultColWidth;
  const { overflow } = resolveTextDrawMode(data);
  if (!overflow) return 1;

  const textWidth = measureCtx.measureText(text).width;
  const innerW = colW - CELL_TEXT_PAD_X * 2;
  if (textWidth <= innerW) return 1;

  const edc = computeOverflowEndCol(
    cellMap,
    r,
    c,
    textWidth,
    colW,
    layout.totalCols,
  );
  return edc - c + 1;
}

/**
 * 内联编辑器宽度：至少盖住整格（含外扩），长文/溢出时随内容变宽。
 */
export function computeEditorWidth(
  measureCtx: CanvasRenderingContext2D,
  text: string,
  data: CellAttributes | undefined,
  colSpan: number,
  layout: Pick<GridLayout, "defaultColWidth" | "viewportW">,
  editorLeft: number,
): number {
  const colW = layout.defaultColWidth;
  const o = CELL_EDITOR_OUTSET;
  const minW = colW + o * 2;
  const spanW = colSpan * colW + o * 2;

  measureCtx.font = data
    ? cellFontString(data)
    : "11px -apple-system, BlinkMacSystemFont, sans-serif";
  const textW =
    measureCtx.measureText(text).width + CELL_TEXT_PAD_X * 2 + o * 2;
  const maxW = Math.max(minW, layout.viewportW - editorLeft - 4);
  return Math.min(maxW, Math.max(minW, spanW, textW));
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
  const needed = textWidth + CELL_TEXT_PAD_X * 2;
  let totalW = colW;
  let edc = c;

  while (totalW < needed && edc < totalCols - 1) {
    const next = edc + 1;
    if (cellBlocksOverflow(cellMap, r, next)) break;
    edc = next;
    totalW += colW;
  }
  return edc;
}

function resolveTextDrawMode(data: CellAttributes): {
  overflow: boolean;
  truncate: boolean;
} {
  const tb = data.tb;
  if (tb === 0) return { overflow: false, truncate: true };
  if (tb === 2) return { overflow: false, truncate: true };
  // tb === 1 或未设置：Excel / 腾讯文档默认溢出
  return { overflow: true, truncate: false };
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
  if (!text || maxWidth <= 0) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;

  const ellipsis = "…";
  if (ctx.measureText(ellipsis).width > maxWidth) return "";

  let end = text.length;
  while (
    end > 0 &&
    ctx.measureText(text.slice(0, end) + ellipsis).width > maxWidth
  ) {
    end--;
  }
  return end > 0 ? text.slice(0, end) + ellipsis : ellipsis;
}

export interface DrawCellTextOptions {
  /** 横向占用的列数（含当前列），默认 1 */
  colSpan?: number;
  /** 超出 clip 宽时是否用省略号截断；默认 false（纯 clip） */
  truncate?: boolean;
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
  const content = String(text);
  if (!content) return;

  const colSpan = Math.max(1, options?.colSpan ?? 1);
  const truncate = options?.truncate ?? false;

  const clipX = cx + CELL_TEXT_PAD_X;
  const clipY = cy + CELL_TEXT_PAD_Y;
  const clipW = Math.max(0, colW * colSpan - CELL_TEXT_PAD_X * 2);
  const clipH = Math.max(0, rowH - CELL_TEXT_PAD_Y * 2);
  if (clipW <= 0 || clipH <= 0) return;

  const display =
    truncate && ctx.measureText(content).width > clipW
      ? truncateTextToWidth(ctx, content, clipW)
      : content;

  ctx.save();
  ctx.beginPath();
  ctx.rect(clipX, clipY, clipW, clipH);
  ctx.clip();
  ctx.fillText(display, clipX, cy + rowH / 2);
  ctx.restore();
}

export function renderSheet(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions,
): void {
  const {
    layout,
    cells,
    merges = [],
    mergeCtx: mergeCtxIn,
    selection,
    isSelecting = false,
    editingCell,
    clipboardRange,
    formulaRefRanges,
    dataVerifications,
  } = options;
  const mc =
    mergeCtxIn ?? MergeContext.fromRanges(merges);
  const mergeLookup = mc.lookup;
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
  const M = resolveMetrics(layout);

  const { rowStart, rowEnd, colStart, colEnd } = getVisibleRange(layout);

  const cellMap: CellMap = buildCellMap(cells);

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
  // 竖线按「行段」绘制，仅在合并块内部跳过，不影响同列其它行
  for (let c = colStart; c <= colEnd + 1; c++) {
    const x = c < totalCols ? gridCellX(layout, M, c) : RHW + M.totalWidth - sx;
    if (x < RHW - 1 || x > vw + 1) continue;
    for (let r = rowStart; r <= rowEnd; r++) {
      if (mc.isInternalColLineAtRow(c, r)) continue;
      const y0 = gridCellY(layout, M, r);
      const y1 = y0 + M.rowHeight(r);
      if (y1 < CHH || y0 > vh) continue;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, Math.max(CHH, y0));
      ctx.lineTo(x + 0.5, Math.min(vh, y1));
      ctx.stroke();
    }
  }
  // 横线按「列段」绘制，仅在合并块内部跳过
  for (let r = rowStart; r <= rowEnd + 1; r++) {
    const y =
      r < totalRows ? gridCellY(layout, M, r) : CHH + M.totalHeight - sy;
    if (y < CHH - 1 || y > vh + 1) continue;
    for (let c = colStart; c <= colEnd; c++) {
      if (mc.isInternalRowLineAtCol(r, c)) continue;
      const x0 = gridCellX(layout, M, c);
      const x1 = x0 + M.colWidth(c);
      if (x1 < RHW || x0 > vw) continue;
      ctx.beginPath();
      ctx.moveTo(Math.max(RHW, x0), y + 0.5);
      ctx.lineTo(Math.min(vw, x1), y + 0.5);
      ctx.stroke();
    }
  }

  for (const { r, c, data } of cells) {
    if (mergeLookup.isSlave(r, c)) continue

    const merge = mergeLookup.at(r, c)
    const isAnchor = merge != null && merge.r === r && merge.c === c
    const pixel = isAnchor && merge
      ? mc.pixelRect(merge, layout, M)
      : {
          x: gridCellX(layout, M, c),
          y: gridCellY(layout, M, r),
          w: M.colWidth(c),
          h: M.rowHeight(r),
        }
    const { x: cx, y: cy, w: cellW, h: cellH } = pixel
    if (cx + cellW < 0 || cx > vw || cy + cellH < 0 || cy > vh) continue

    if (data.bg) {
      ctx.fillStyle = data.bg;
      ctx.fillRect(cx, cy, cellW, cellH);
    }

    let font = `${data.fs ?? 11}px -apple-system, BlinkMacSystemFont, sans-serif`;
    if (data.bl) font = `bold ${font}`;
    if (data.it) font = `italic ${font}`;
    ctx.font = font;
    ctx.fillStyle = data.fc ?? "#333";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const dvKey = `${r}_${c}`;
    const dvRule = dataVerifications?.get(dvKey);
    const isEditing =
      editingCell != null && editingCell.r === r && editingCell.c === c;

    if (dvRule?.type === "checkbox") {
      if (!isEditing) {
        const textStartX = drawCellCheckbox(ctx, cx, cy, cellW, cellH, dvRule);
        const label = cellDisplayText(data);
        if (label) {
          ctx.fillStyle = data.fc ?? "#333";
          const clipW = Math.max(0, cx + cellW - textStartX - CELL_TEXT_PAD_X);
          drawCellText(ctx, label, textStartX, cy, clipW, cellH, {
            colSpan: 1,
            truncate: true,
          });
        }
      }
      continue;
    }

    if (dvRule?.type === "dropdown" && !isEditing) {
      drawCellDropdown(ctx, cx, cy, cellW, cellH, data, dvRule);
      continue;
    }

    if (data.att && !isEditing) {
      const label = data.m ?? data.att.fileName ?? "附件";
      const display = `📎 ${label}`;
      ctx.fillStyle = data.fc ?? "#1677ff";
      drawCellText(ctx, display, cx + CELL_TEXT_PAD_X, cy, cellW, cellH, {
        colSpan: 1,
        truncate: true,
      });
      continue;
    }

    const text = cellDisplayText(data);
    if (!text) continue;

    // 内联编辑时由 DOM input 显示文字，canvas 不再绘制（避免重影）
    if (isEditing) {
      continue;
    }

    const { overflow, truncate } = resolveTextDrawMode(data);
    let colSpan = 1;
    const useTruncate = truncate;

    if (!isAnchor && overflow) {
      const textWidth = ctx.measureText(text).width;
      const innerW = cellW - CELL_TEXT_PAD_X * 2;
      if (textWidth > innerW) {
        const edc = computeOverflowEndCol(
          cellMap,
          r,
          c,
          textWidth,
          cellW,
          totalCols,
        );
        colSpan = edc - c + 1;
      }
    }

    drawCellText(ctx, text, cx, cy, cellW, cellH, {
      colSpan,
      truncate: useTruncate,
    });

    if (data.ef) {
      drawFormulaErrorMarker(ctx, cx, cy);
    }
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

  for (let c = colStart; c <= colEnd; c++) {
    const left = gridCellX(layout, M, c);
    const cx = left + M.colWidth(c) / 2;
    ctx.fillText(colToLetter(c), cx, CHH / 2);
  }

  ctx.strokeStyle = "#c0c0c0";
  ctx.lineWidth = 0.5;

  for (let c = colStart; c <= colEnd + 1; c++) {
    const x = c < totalCols ? gridCellX(layout, M, c) : RHW + M.totalWidth - sx;
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
    const top = gridCellY(layout, M, r);
    const cy = top + M.rowHeight(r) / 2;
    ctx.fillText(String(r + 1), RHW / 2, cy);
  }
  ctx.strokeStyle = "#c0c0c0";
  ctx.lineWidth = 0.5;
  for (let r = rowStart; r <= rowEnd + 1; r++) {
    const y =
      r < totalRows ? gridCellY(layout, M, r) : CHH + M.totalHeight - sy;
    if (y < CHH - 1 || y > vh + 1) continue;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5); // 行头左缘
    ctx.lineTo(RHW, y + 0.5); // 行头右缘（与格子交界）
    ctx.stroke();
  }

  ctx.restore();

  // ---- Corner box ----
  ctx.fillStyle = "#e8e8e8";
  ctx.fillRect(0, 0, RHW, CHH);
  ctx.strokeStyle = "#c0c0c0";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(0, 0, RHW, CHH);

  // ---- Selection（对齐 Luckysheet：范围框 + 焦点框；焦点在合并区内则按整块 merge 画） ----
  const r0 = selection.row[0],
    r1 = selection.row[1],
    c0 = selection.column[0],
    c1 = selection.column[1];
  const ar = selection.anchor?.r ?? r0;
  const ac = selection.anchor?.c ?? c0;
  const rangeRect = selectionBox(layout, M, r0, c0, r1, c1);
  const { x: selX, y: selY, w: selW, h: selH } = rangeRect;
  const focusRect = mc.focusPixelRect(ar, ac, layout, M);
  const isMultiCell = r0 !== r1 || c0 !== c1;
  const matchingMerge = mc.findMatchingSelection(r0, c0, r1, c1);
  const focusMerge = mergeLookup.at(ar, ac);
  const isMergedFocus =
    focusMerge != null &&
    focusMerge.r === ar &&
    focusMerge.c === ac &&
    (focusMerge.rs > 1 || focusMerge.cs > 1);
  const unifiedRect = matchingMerge
    ? mc.pixelRect(matchingMerge, layout, M)
    : isMergedFocus && !isMultiCell
      ? focusRect
      : null;
  const isEditingFocus =
    editingCell != null && editingCell.r === ar && editingCell.c === ac;

  const strokeFocus = (rect: { x: number; y: number; w: number; h: number }) => {
    const ins = CELL_SELECTION_INSET;
    ctx.strokeStyle = "#1a73e8";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      rect.x + ins,
      rect.y + ins,
      rect.w - ins * 2,
      rect.h - ins * 2,
    );
  };

  if (selX + selW > 0 && selX < vw && selY + selH > 0 && selY < vh) {
    const drawFill = (rect: { x: number; y: number; w: number; h: number }) => {
      ctx.fillStyle = "rgba(26,115,232,0.08)";
      ctx.fillRect(
        rect.x + 1,
        rect.y + 1,
        Math.max(0, rect.w - 1),
        Math.max(0, rect.h - 1),
      );
    };

    const focusSameAsRange =
      Math.abs(focusRect.x - selX) < 1 &&
      Math.abs(focusRect.y - selY) < 1 &&
      Math.abs(focusRect.w - selW) < 1 &&
      Math.abs(focusRect.h - selH) < 1;

    if (unifiedRect) {
      drawFill(unifiedRect);
      if (!isEditingFocus) strokeFocus(unifiedRect);
    } else if (isMultiCell) {
      drawFill(rangeRect);
      if ((isMultiCell || isSelecting) && !focusSameAsRange) {
        ctx.strokeStyle = "#1a73e8";
        ctx.lineWidth = 1;
        ctx.strokeRect(selX + 0.5, selY + 0.5, selW - 1, selH - 1);
      }
      if (!isEditingFocus) strokeFocus(focusRect);
    } else {
      drawFill(focusRect);
      if (!isEditingFocus) strokeFocus(focusRect);
    }

    const handleRect = unifiedRect ?? (isMultiCell ? rangeRect : focusRect);
    const hx = handleRect.x + handleRect.w - 5;
    const hy = handleRect.y + handleRect.h - 5;
    if (hx > 0 && hy > 0 && !isSelecting) {
      ctx.fillStyle = "#1a73e8";
      ctx.fillRect(hx, hy, 5, 5);
    }
  }

  // ---- 公式引用虚线框 ----
  if (formulaRefRanges?.length) {
    for (const ref of formulaRefRanges) {
      const rr0 = ref.row[0];
      const rr1 = ref.row[1];
      const cc0 = ref.column[0];
      const cc1 = ref.column[1];
      const {
        x: rx,
        y: ry,
        w: rw,
        h: rh,
      } = selectionBox(layout, M, rr0, cc0, rr1, cc1);
      if (rx + rw <= 0 || rx >= vw || ry + rh <= 0 || ry >= vh) continue;
      ctx.save();
      ctx.fillStyle = ref.color;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(rx + 1, ry + 1, rw - 1, rh - 1);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ref.color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // ---- 复制/剪切虚线框 ----
  if (clipboardRange) {
    const cr0 = clipboardRange.row[0];
    const cr1 = clipboardRange.row[1];
    const cc0 = clipboardRange.column[0];
    const cc1 = clipboardRange.column[1];
    const {
      x: clipX,
      y: clipY,
      w: clipW,
      h: clipH,
    } = selectionBox(layout, M, cr0, cc0, cr1, cc1);
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

  // ---- Header highlight（行列范围与 Luckysheet selectTitlesMap 一致，含合并区） ----
  const headerBounds = mc.displayBounds(selection);
  const hr0 = headerBounds.r0;
  const hr1 = headerBounds.r1;
  const hc0 = headerBounds.c0;
  const hc1 = headerBounds.c1;
  const {
    x: headerX,
    y: headerY,
    w: headerW,
    h: headerH,
  } = selectionBox(layout, M, hr0, hc0, hr1, hc1);
  const colLeft = headerX;
  const colRight = headerX + headerW;
  const rowTop = headerY;
  const rowBottom = headerY + headerH;

  ctx.fillStyle = "#E7E9E8";
  for (let c = hc0; c <= hc1; c++) {
    const left = gridCellX(layout, M, c);
    const cw = M.colWidth(c);
    if (left + cw < RHW || left > vw) continue;
    ctx.fillRect(left, 0, cw, CHH);
  }
  for (let r = hr0; r <= hr1; r++) {
    const top = gridCellY(layout, M, r);
    const rh = M.rowHeight(r);
    if (top + rh < CHH || top > vh) continue;
    ctx.fillRect(0, top, RHW, rh);
  }

  // 表头内竖线 / 横线（铺底后再画，避免 F|G 之间线消失）
  ctx.strokeStyle = "#c0c0c0";
  ctx.lineWidth = 0.5;
  for (let c = hc0; c <= hc1 + 1; c++) {
    const x = c < totalCols ? gridCellX(layout, M, c) : RHW + M.totalWidth - sx;
    if (x < colLeft - 1 || x > colRight + 1) continue;
    if (x < RHW - 1 || x > vw + 1) continue;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, CHH);
    ctx.stroke();
  }
  for (let r = hr0; r <= hr1 + 1; r++) {
    const y =
      r < totalRows ? gridCellY(layout, M, r) : CHH + M.totalHeight - sy;
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

  for (let c = hc0; c <= hc1; c++) {
    const left = gridCellX(layout, M, c);
    const cx = left + M.colWidth(c) / 2;
    if (cx > RHW - M.colWidth(c) && cx < vw + M.colWidth(c)) {
      ctx.fillStyle = "#555";
      ctx.fillText(colToLetter(c), cx, CHH / 2);
    }
  }
  for (let r = hr0; r <= hr1; r++) {
    const top = gridCellY(layout, M, r);
    const cy = top + M.rowHeight(r) / 2;
    if (cy > CHH - M.rowHeight(r) && cy < vh + M.rowHeight(r)) {
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
  const M = resolveMetrics(layout);
  const x = clientX - canvasRect.left - layout.rowHeaderWidth + layout.scrollX;
  const y =
    clientY - canvasRect.top - layout.columnHeaderHeight + layout.scrollY;
  return {
    r: M.rowAtY(y),
    c: M.colAtX(x),
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
  merge?: MergeContext | MergeRange[],
): { x: number; y: number; w: number; h: number } {
  const M = resolveMetrics(layout);
  const mc =
    merge instanceof MergeContext
      ? merge
      : MergeContext.fromRanges(merge ?? []);
  if (!mc.isEmpty) {
    const m = mc.at(r, c);
    if (m) return mc.pixelRect(m, layout, M);
  }
  return {
    x: layout.rowHeaderWidth + M.colLeft(c),
    y: layout.columnHeaderHeight + M.rowTop(r),
    w: M.colWidth(c),
    h: M.rowHeight(r),
  };
}

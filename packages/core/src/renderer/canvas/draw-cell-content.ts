import type { CellAttributes, DataVerificationRule } from '@speed-sheet/shared'
import { CELL_TEXT_PAD_X, CHECKBOX_GAP, CHECKBOX_SIZE, DROPDOWN_ARROW_W } from './constants'
import { cellDisplayText, drawCellText } from './cell-text'

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

/** 公式错误角标（左上红色三角，对齐 Excel） */
export function drawFormulaErrorMarker(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  ctx.save()
  ctx.fillStyle = '#e74c3c'
  ctx.beginPath()
  ctx.moveTo(cx + 1, cy + 1)
  ctx.lineTo(cx + 7, cy + 1)
  ctx.lineTo(cx + 1, cy + 7)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** 在单元格内绘制复选框（Canvas；状态来自 dataVerification.checked） */
export function drawCellCheckbox(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellW: number,
  cellH: number,
  rule: DataVerificationRule,
): number {
  const size = CHECKBOX_SIZE
  const boxX = cx + CELL_TEXT_PAD_X
  const boxY = cy + (cellH - size) / 2
  const checked = !!rule.checked

  ctx.save()
  if (checked) {
    ctx.fillStyle = '#00b96b'
    ctx.strokeStyle = '#00b96b'
    roundRect(ctx, boxX, boxY, size, size, 3)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(boxX + 3, boxY + size / 2)
    ctx.lineTo(boxX + size / 2 - 0.5, boxY + size - 4)
    ctx.lineTo(boxX + size - 3, boxY + 3)
    ctx.stroke()
  } else {
    ctx.strokeStyle = '#bfbfbf'
    ctx.lineWidth = 1.5
    roundRect(ctx, boxX, boxY, size, size, 3)
    ctx.stroke()
  }
  ctx.restore()
  return boxX + size + CHECKBOX_GAP
}

function dropdownDisplayText(data: CellAttributes, rule: DataVerificationRule): string {
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

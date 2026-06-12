import type { CellAttributes } from '@speed-sheet/shared'
import type { CfCellConditionOp } from './types'

function cellText(cell: CellAttributes | null | undefined): string {
  if (!cell) return ''
  const v = cell.m ?? cell.v
  if (v == null) return ''
  return String(v).trim()
}

function cellNumber(cell: CellAttributes | null | undefined): number | null {
  const t = cellText(cell)
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function evaluateCellCondition(
  cell: CellAttributes | null | undefined,
  op: CfCellConditionOp,
  value: string,
  value2?: string,
): boolean {
  const text = cellText(cell)
  const num = cellNumber(cell)

  switch (op) {
    case 'greaterThan': {
      const v = Number(value)
      if (!Number.isFinite(v) || num == null) return false
      return num > v
    }
    case 'lessThan': {
      const v = Number(value)
      if (!Number.isFinite(v) || num == null) return false
      return num < v
    }
    case 'equal': {
      const v = value.trim()
      if (num != null && Number.isFinite(Number(v))) return num === Number(v)
      return text === v
    }
    case 'between': {
      const a = Number(value)
      const b = Number(value2 ?? '')
      if (!Number.isFinite(a) || !Number.isFinite(b) || num == null) return false
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      return num >= lo && num <= hi
    }
    case 'textContains':
      return text.includes(value)
    default:
      return false
  }
}

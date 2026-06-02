import type { CellAttributes } from '@speed-sheet/shared'
import { FILTER_EMPTY_VALUE } from './types'

export function cellValueText(cell: CellAttributes | null | undefined): string {
  if (!cell) return ''
  if (cell.m != null && cell.m !== '') return String(cell.m)
  if (cell.v == null || cell.v === '') return ''
  return String(cell.v)
}

export function isCellEmpty(cell: CellAttributes | null | undefined): boolean {
  return cellValueText(cell) === ''
}

export function filterValueKey(cell: CellAttributes | null | undefined): string {
  const t = cellValueText(cell)
  return t === '' ? FILTER_EMPTY_VALUE : t
}

export function filterValueLabel(key: string): string {
  return key === FILTER_EMPTY_VALUE ? '(空)' : key
}

import type { SheetState } from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'
import { FILTER_COLOR_NONE, type FilterColorDimension, type FilterColorStat } from './types'

function normalizeHex(color: string): string {
  const c = color.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(c)) {
    const r = c[1]!
    const g = c[2]!
    const b = c[3]!
    return `#${r}${r}${g}${g}${b}${b}`
  }
  if (/^#[0-9a-f]{6}$/.test(c)) return c
  return c
}

/** 默认文字色（与 canvas 缺省 fc 一致） */
const DEFAULT_FONT_COLOR = '#333333'

export function bgColorKey(cell: CellAttributes | null | undefined): string {
  const bg = cell?.bg
  if (bg == null || bg === '') return FILTER_COLOR_NONE
  return normalizeHex(bg)
}

export function fcColorKey(cell: CellAttributes | null | undefined): string {
  const fc = cell?.fc
  if (fc == null || fc === '') return DEFAULT_FONT_COLOR
  return normalizeHex(fc)
}

export function colorKeyForDimension(
  cell: CellAttributes | null | undefined,
  dimension: FilterColorDimension,
): string {
  return dimension === 'bg' ? bgColorKey(cell) : fcColorKey(cell)
}

export function colorStatLabel(value: string, dimension: FilterColorDimension): string {
  if (value === FILTER_COLOR_NONE) {
    return dimension === 'bg' ? '(无填充)' : '(默认)'
  }
  return value
}

export function colorStatDisplay(value: string): string {
  if (value === FILTER_COLOR_NONE) return 'transparent'
  return value
}

export interface ColumnColorAvailability {
  bgEnabled: boolean
  fcEnabled: boolean
  /** 两种都有多种颜色时默认背景色 */
  defaultDimension: FilterColorDimension
}

export function detectColumnColorAvailability(
  state: SheetState,
  column: number,
  dataStartRow: number,
  dataEndRow: number,
  headerRow: number | null,
): ColumnColorAvailability {
  const bgKeys = new Set<string>()
  const fcKeys = new Set<string>()
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    if (headerRow != null && r === headerRow) continue
    const cell = state.getCellData(r, column)
    bgKeys.add(bgColorKey(cell))
    fcKeys.add(fcColorKey(cell))
  }
  const bgEnabled = bgKeys.size > 1
  const fcEnabled = fcKeys.size > 1
  let defaultDimension: FilterColorDimension = 'bg'
  if (bgEnabled) defaultDimension = 'bg'
  else if (fcEnabled) defaultDimension = 'fc'
  return { bgEnabled, fcEnabled, defaultDimension }
}

export function collectColumnColorStats(
  state: SheetState,
  column: number,
  dimension: FilterColorDimension,
  dataStartRow: number,
  dataEndRow: number,
  headerRow: number | null,
): FilterColorStat[] {
  const counts = new Map<string, number>()
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    if (headerRow != null && r === headerRow) continue
    const key = colorKeyForDimension(state.getCellData(r, column), dimension)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const stats: FilterColorStat[] = []
  for (const [value, count] of counts) {
    stats.push({
      value,
      label: colorStatLabel(value, dimension),
      color: colorStatDisplay(value),
      count,
    })
  }
  stats.sort((a, b) => {
    if (a.value === FILTER_COLOR_NONE) return -1
    if (b.value === FILTER_COLOR_NONE) return 1
    return a.label.localeCompare(b.label, 'zh-CN')
  })
  return stats
}

/** 按颜色单选：默认选中第一项（无填充优先） */
export function defaultSelectedColor(stats: FilterColorStat[]): string {
  return stats[0]?.value ?? FILTER_COLOR_NONE
}

export function defaultSelectedColors(stats: FilterColorStat[]): string[] {
  const v = defaultSelectedColor(stats)
  return v ? [v] : []
}

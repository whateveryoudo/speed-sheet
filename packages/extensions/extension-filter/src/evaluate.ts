import type { SheetState } from '@speed-sheet/core'
import {
  colorKeyForDimension,
  collectColumnColorStats,
  defaultSelectedColors,
  detectColumnColorAvailability,
} from './color'
import {
  buildColumnValueCounts,
  buildInitialConditionRule,
  rowPassesConditionRule,
  ruleNeedsValueCounts,
} from './condition'
import {
  FILTER_EMPTY_VALUE,
  type FilterColumnRule,
  type FilterSession,
  type FilterValueStat,
} from './types'
import { cellValueText, filterValueKey, filterValueLabel } from './cell-value'

export function collectColumnValueStats(
  state: SheetState,
  column: number,
  dataStartRow: number,
  dataEndRow: number,
  headerRow: number | null,
): FilterValueStat[] {
  const counts = new Map<string, number>()
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    if (headerRow != null && r === headerRow) continue
    const key = filterValueKey(state.getCellData(r, column))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const stats: FilterValueStat[] = []
  for (const [value, count] of counts) {
    stats.push({ value, label: filterValueLabel(value), count })
  }
  stats.sort((a, b) => {
    if (a.value === FILTER_EMPTY_VALUE) return 1
    if (b.value === FILTER_EMPTY_VALUE) return -1
    return a.label.localeCompare(b.label, 'zh-CN')
  })
  return stats
}

export function defaultSelectedValues(stats: FilterValueStat[]): string[] {
  return stats.map((s) => s.value)
}

function rowPassesContentRule(
  state: SheetState,
  r: number,
  column: number,
  rule: FilterColumnRule,
): boolean {
  const content = rule.content
  if (!content || content.mode !== 'content') return true
  const key = filterValueKey(state.getCellData(r, column))
  return content.selectedValues.includes(key)
}

function rowPassesColorRule(
  state: SheetState,
  r: number,
  column: number,
  rule: FilterColumnRule,
): boolean {
  const color = rule.color
  if (!color || color.mode !== 'color') return true
  const cell = state.getCellData(r, column)
  const dim = color.dimension
  const selected = dim === 'bg' ? color.selectedBg : color.selectedFc
  const key = colorKeyForDimension(cell, dim)
  return selected.includes(key)
}

function rowPassesConditionColumnRule(
  state: SheetState,
  r: number,
  column: number,
  rule: FilterColumnRule,
  session: FilterSession,
  valueCountsByColumn: Map<number, Map<string, number>>,
): boolean {
  const cond = rule.condition
  if (!cond || cond.mode !== 'condition') return true
  const scope = {
    dataStartRow: session.dataStartRow,
    dataEndRow: session.dataEndRow,
    headerRow: session.headerRow,
  }
  const valueCounts = valueCountsByColumn.get(column)
  return rowPassesConditionRule(state, r, column, cond, scope, valueCounts)
}

function buildValueCountsByColumn(
  state: SheetState,
  session: FilterSession,
): Map<number, Map<string, number>> {
  const map = new Map<number, Map<string, number>>()
  const { columnRules, dataStartRow, dataEndRow, headerRow } = session
  for (const rule of columnRules) {
    if (rule.filterMode !== 'condition' || !rule.condition) continue
    if (!ruleNeedsValueCounts(rule.condition)) continue
    if (map.has(rule.column)) continue
    map.set(
      rule.column,
      buildColumnValueCounts(state, rule.column, dataStartRow, dataEndRow, headerRow),
    )
  }
  return map
}

function rowPassesColumnRule(
  state: SheetState,
  r: number,
  column: number,
  rule: FilterColumnRule,
  session: FilterSession,
  valueCountsByColumn: Map<number, Map<string, number>>,
): boolean {
  if (rule.filterMode === 'condition')
    return rowPassesConditionColumnRule(state, r, column, rule, session, valueCountsByColumn)
  if (rule.filterMode === 'color') return rowPassesColorRule(state, r, column, rule)
  return rowPassesContentRule(state, r, column, rule)
}

/** 计算应隐藏的行（AND 多列） */
export function computeHiddenRows(state: SheetState, session: FilterSession): Set<number> {
  const hidden = new Set<number>()
  if (!session.active) return hidden

  const { dataStartRow, dataEndRow, headerRow, columns, columnRules } = session
  const ruleByCol = new Map(columnRules.map((r) => [r.column, r]))
  const valueCountsByColumn = buildValueCountsByColumn(state, session)

  for (let r = dataStartRow; r <= dataEndRow; r++) {
    if (headerRow != null && r === headerRow) continue
    let visible = true
    for (const c of columns) {
      const rule = ruleByCol.get(c)
      if (!rule) continue
      if (!rowPassesColumnRule(state, r, c, rule, session, valueCountsByColumn)) {
        visible = false
        break
      }
    }
    if (!visible) hidden.add(r)
  }
  return hidden
}

function buildInitialColorRule(
  state: SheetState,
  column: number,
  scope: Pick<FilterSession, 'dataStartRow' | 'dataEndRow' | 'headerRow'>,
): FilterColumnRule['color'] {
  const avail = detectColumnColorAvailability(
    state,
    column,
    scope.dataStartRow,
    scope.dataEndRow,
    scope.headerRow,
  )
  const dim = avail.defaultDimension
  const bgStats = collectColumnColorStats(
    state,
    column,
    'bg',
    scope.dataStartRow,
    scope.dataEndRow,
    scope.headerRow,
  )
  const fcStats = collectColumnColorStats(
    state,
    column,
    'fc',
    scope.dataStartRow,
    scope.dataEndRow,
    scope.headerRow,
  )
  return {
    mode: 'color',
    dimension: dim,
    selectedBg: defaultSelectedColors(bgStats),
    selectedFc: defaultSelectedColors(fcStats),
  }
}

export function buildInitialColumnRules(
  state: SheetState,
  scope: Pick<FilterSession, 'columns' | 'dataStartRow' | 'dataEndRow' | 'headerRow'>,
): FilterColumnRule[] {
  return scope.columns.map((column) => {
    const stats = collectColumnValueStats(
      state,
      column,
      scope.dataStartRow,
      scope.dataEndRow,
      scope.headerRow,
    )
    return {
      column,
      filterMode: 'content',
      content: {
        mode: 'content',
        selectedValues: defaultSelectedValues(stats),
      },
      color: buildInitialColorRule(state, column, scope),
      condition: buildInitialConditionRule(),
      sort: null,
    }
  })
}

export function displayCellText(state: SheetState, r: number, c: number): string {
  return cellValueText(state.getCellData(r, c))
}

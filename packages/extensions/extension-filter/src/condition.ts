import dayjs from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import type { SheetState } from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'
import { cellValueText, filterValueKey, isCellEmpty } from './cell-value'
import { defaultOperatorForType } from './condition-meta'
import type {
  CommonConditionOp,
  DateConditionPreset,
  FilterConditionClause,
  FilterConditionRule,
  FilterConditionTypeTab,
  NumberConditionOp,
  TextConditionOp,
} from './types'

dayjs.extend(isoWeek)

function cellText(cell: CellAttributes | null | undefined): string {
  return cellValueText(cell).trim()
}

function parseNumber(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function cellNumber(cell: CellAttributes | null | undefined): number | null {
  const t = cellText(cell)
  if (t === '') return null
  return parseNumber(t)
}

function parseCellDate(cell: CellAttributes | null | undefined): dayjs.Dayjs | null {
  const t = cellText(cell)
  if (!t) return null
  const d = dayjs(t)
  return d.isValid() ? d.startOf('day') : null
}

export function datePresetRange(preset: DateConditionPreset): { start: dayjs.Dayjs; end: dayjs.Dayjs } {
  const now = dayjs().startOf('day')
  switch (preset) {
    case 'yesterday': {
      const d = now.subtract(1, 'day')
      return { start: d, end: d.endOf('day') }
    }
    case 'today':
      return { start: now, end: now.endOf('day') }
    case 'tomorrow': {
      const d = now.add(1, 'day')
      return { start: d, end: d.endOf('day') }
    }
    case 'last7':
      return { start: now.subtract(6, 'day'), end: now.endOf('day') }
    case 'lastWeek':
      return {
        start: now.subtract(1, 'week').startOf('isoWeek'),
        end: now.subtract(1, 'week').endOf('isoWeek'),
      }
    case 'thisWeek':
      return { start: now.startOf('isoWeek'), end: now.endOf('isoWeek') }
    case 'nextWeek':
      return {
        start: now.add(1, 'week').startOf('isoWeek'),
        end: now.add(1, 'week').endOf('isoWeek'),
      }
    case 'lastMonth':
      return {
        start: now.subtract(1, 'month').startOf('month'),
        end: now.subtract(1, 'month').endOf('month'),
      }
    case 'thisMonth':
      return { start: now.startOf('month'), end: now.endOf('month') }
    case 'nextMonth':
      return {
        start: now.add(1, 'month').startOf('month'),
        end: now.add(1, 'month').endOf('month'),
      }
    default:
      return { start: now, end: now.endOf('day') }
  }
}

function matchText(text: string, op: TextConditionOp, value: string): boolean {
  const v = value
  const t = text
  switch (op) {
    case 'startsWith':
      return t.startsWith(v)
    case 'notStartsWith':
      return !t.startsWith(v)
    case 'endsWith':
      return t.endsWith(v)
    case 'notEndsWith':
      return !t.endsWith(v)
    case 'contains':
      return t.includes(v)
    case 'notContains':
      return !t.includes(v)
    default:
      return true
  }
}

function matchNumber(n: number | null, op: NumberConditionOp, left: string, right?: string): boolean {
  if (n == null) return false
  const a = parseNumber(left)
  if (a == null && op !== 'between') return false
  switch (op) {
    case 'eq':
      return a != null && n === a
    case 'ne':
      return a != null && n !== a
    case 'gt':
      return a != null && n > a
    case 'gte':
      return a != null && n >= a
    case 'lt':
      return a != null && n < a
    case 'lte':
      return a != null && n <= a
    case 'between': {
      const b = parseNumber(right ?? '')
      if (a == null || b == null) return false
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      return n >= lo && n <= hi
    }
    default:
      return true
  }
}

function matchDate(cell: CellAttributes | null | undefined, preset: DateConditionPreset): boolean {
  const d = parseCellDate(cell)
  if (!d) return false
  const { start, end } = datePresetRange(preset)
  const t = d.valueOf()
  return t >= start.valueOf() && t <= end.valueOf()
}

function matchCommon(
  cell: CellAttributes | null | undefined,
  op: CommonConditionOp,
  valueCounts: Map<string, number>,
): boolean {
  const key = filterValueKey(cell)
  const count = valueCounts.get(key) ?? 0
  switch (op) {
    case 'empty':
      return isCellEmpty(cell)
    case 'nonEmpty':
      return !isCellEmpty(cell)
    case 'duplicate':
      return count > 1
    case 'unique':
      return count === 1
    default:
      return true
  }
}

export function buildColumnValueCounts(
  state: SheetState,
  column: number,
  dataStartRow: number,
  dataEndRow: number,
  headerRow: number | null,
): Map<string, number> {
  const counts = new Map<string, number>()
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    if (headerRow != null && r === headerRow) continue
    const key = filterValueKey(state.getCellData(r, column))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

export interface FilterConditionScope {
  dataStartRow: number
  dataEndRow: number
  headerRow: number | null
}

export function evaluateConditionClause(
  cell: CellAttributes | null | undefined,
  typeTab: FilterConditionTypeTab,
  clause: FilterConditionClause,
  valueCounts?: Map<string, number>,
): boolean {
  if (clause.type !== typeTab) return true
  if (typeTab === 'common') {
    const op = clause.operator as CommonConditionOp
    if (op === 'empty' || op === 'nonEmpty') {
      return matchCommon(cell, op, new Map())
    }
    if (!valueCounts) return false
    return matchCommon(cell, op, valueCounts)
  }
  const text = cellText(cell)
  if (typeTab === 'text') {
    return matchText(text, clause.operator as TextConditionOp, clause.value)
  }
  if (typeTab === 'number') {
    return matchNumber(
      cellNumber(cell),
      clause.operator as NumberConditionOp,
      clause.value,
      clause.valueRight,
    )
  }
  return matchDate(cell, clause.operator as DateConditionPreset)
}

export function evaluateConditionClauses(
  cell: CellAttributes | null | undefined,
  rule: FilterConditionRule,
  valueCounts?: Map<string, number>,
): boolean {
  const { typeTab, clauses } = rule
  if (!clauses.length) return true
  let result = evaluateConditionClause(cell, typeTab, clauses[0]!, valueCounts)
  for (let i = 0; i < clauses.length - 1; i++) {
    const conn = clauses[i]!.connector ?? 'and'
    const next = evaluateConditionClause(cell, typeTab, clauses[i + 1]!, valueCounts)
    result = conn === 'or' ? result || next : result && next
  }
  return result
}

export function createDefaultConditionClause(
  typeTab: FilterConditionTypeTab,
): FilterConditionClause {
  return {
    type: typeTab,
    operator: defaultOperatorForType(typeTab),
    value: '',
    valueRight: '',
    connector: 'and',
  }
}

export function buildInitialConditionRule(): FilterConditionRule {
  return {
    mode: 'condition',
    typeTab: 'text',
    clauses: [createDefaultConditionClause('text')],
  }
}

/** 通用值条件（重复/唯一）需列内频次；空/非空不依赖 */
export function ruleNeedsValueCounts(rule: FilterConditionRule): boolean {
  return rule.typeTab === 'common'
}

/** 列内按条件筛选行是否可见 */
export function rowPassesConditionRule(
  state: SheetState,
  r: number,
  column: number,
  rule: FilterConditionRule,
  scope: FilterConditionScope,
  valueCounts?: Map<string, number>,
): boolean {
  const cell = state.getCellData(r, column)
  return evaluateConditionClauses(cell, rule, valueCounts)
}

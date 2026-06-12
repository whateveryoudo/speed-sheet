import type { SheetState } from '@speed-sheet/core'
import { transactUser } from '@speed-sheet/core'
import type { CfRule } from './types'

export const CF_YDOC_KEY = 'sheetConditionalFormats'

function isCfRule(raw: unknown): raw is CfRule {
  if (!raw || typeof raw !== 'object') return false
  const r = raw as CfRule
  return (
    typeof r.id === 'string' &&
    (r.type === 'cell' || r.type === 'dataBar') &&
    Array.isArray(r.row) &&
    r.row.length === 2 &&
    Array.isArray(r.column) &&
    r.column.length === 2
  )
}

export function deserializeCfRules(raw: unknown): CfRule[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(isCfRule).map((r) => ({
    ...r,
    row: [Math.min(r.row[0], r.row[1]), Math.max(r.row[0], r.row[1])] as [number, number],
    column: [Math.min(r.column[0], r.column[1]), Math.max(r.column[0], r.column[1])] as [
      number,
      number,
    ],
  }))
}

export function readCfRulesFromYdoc(state: SheetState): CfRule[] {
  return deserializeCfRules(state.root.get(CF_YDOC_KEY))
}

export function writeCfRulesToYdoc(state: SheetState, rules: CfRule[]): void {
  const doc = state.root.doc
  if (!doc) return
  transactUser(doc, () => {
    if (rules.length === 0) {
      if (state.root.has(CF_YDOC_KEY)) state.root.delete(CF_YDOC_KEY)
      return
    }
    state.root.set(CF_YDOC_KEY, JSON.parse(JSON.stringify(rules)))
  })
}

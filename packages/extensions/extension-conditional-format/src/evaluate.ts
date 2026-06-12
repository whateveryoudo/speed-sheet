import type { CellAttributes } from '@speed-sheet/shared'
import type { SheetState } from '@speed-sheet/core'
import type {
  CfCellRenderStyle,
  CfDataBarRender,
  CfDataBarStyle,
  CfRule,
} from './types'
import { cellInRange } from './range'
import { evaluateCellCondition } from './condition'

function resolveBound(
  type: CfDataBarStyle['minType'],
  raw: string | undefined,
  values: number[],
): number {
  if (type === 'min') return values.length ? Math.min(...values) : 0
  if (type === 'max') return values.length ? Math.max(...values) : 0
  const n = Number(raw ?? '')
  if (!Number.isFinite(n)) return 0
  if (type === 'percent') {
    const max = values.length ? Math.max(...values) : 0
    return max * (n / 100)
  }
  return n
}

function cellNumber(cell: CellAttributes | null | undefined): number | null {
  if (!cell) return null
  const v = cell.m ?? cell.v
  if (v == null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export type CfRenderMaps = {
  cellStyles: Map<string, CfCellRenderStyle>
  dataBars: Map<string, CfDataBarRender>
}

export function buildCfRenderMaps(
  rules: CfRule[],
  state: SheetState,
  cells: Array<{ r: number; c: number; data: CellAttributes }>,
): CfRenderMaps {
  const cellStyles = new Map<string, CfCellRenderStyle>()
  const dataBars = new Map<string, CfDataBarRender>()
  if (!rules.length || !cells.length) return { cellStyles, dataBars }

  const cellMap = new Map<string, CellAttributes>()
  for (const { r, c, data } of cells) {
    cellMap.set(`${r}_${c}`, data)
  }

  for (const rule of rules) {
    if (rule.type === 'cell') {
      const op = rule.conditionOp ?? 'equal'
      const v = rule.conditionValue ?? ''
      for (const { r, c } of cells) {
        if (!cellInRange(r, c, rule.row, rule.column)) continue
        const data = cellMap.get(`${r}_${c}`)
        if (!evaluateCellCondition(data, op, v, rule.conditionValue2)) continue
        if (rule.style) cellStyles.set(`${r}_${c}`, { ...rule.style })
      }
      continue
    }

    if (rule.type === 'dataBar' && rule.dataBar) {
      const nums: number[] = []
      const keys: string[] = []
      for (const { r, c } of cells) {
        if (!cellInRange(r, c, rule.row, rule.column)) continue
        const n = cellNumber(cellMap.get(`${r}_${c}`))
        if (n == null) continue
        nums.push(n)
        keys.push(`${r}_${c}`)
      }
      if (!nums.length) continue
      const min = resolveBound(rule.dataBar.minType, rule.dataBar.minValue, nums)
      const max = resolveBound(rule.dataBar.maxType, rule.dataBar.maxValue, nums)
      const span = max - min
      for (let i = 0; i < keys.length; i++) {
        const n = nums[i]
        const ratio = span <= 0 ? 0 : Math.max(0, Math.min(1, (n - min) / span))
        dataBars.set(keys[i], {
          ratio,
          color: rule.dataBar.color,
          gradient: rule.dataBar.gradient,
        })
      }
    }
  }

  return { cellStyles, dataBars }
}

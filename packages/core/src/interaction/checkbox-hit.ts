import type { DataVerificationRule } from '@speed-sheet/shared'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import { gridCellX, gridCellY } from '../renderer/layout-metrics'

const CHECKBOX_SIZE = 14
const PAD = 4

/** 点击是否落在复选框热区（视口相对 canvas 坐标） */
export function hitCheckboxAt(
  cx: number,
  cy: number,
  r: number,
  c: number,
  layout: GridLayout,
  metrics: GridMetrics,
  rule: DataVerificationRule | null,
): boolean {
  if (rule?.type !== 'checkbox') return false
  const x = gridCellX(layout, metrics, c)
  const y = gridCellY(layout, metrics, r)
  const boxX = x + PAD
  const boxY = y + (metrics.rowHeight(r) - CHECKBOX_SIZE) / 2
  return (
    cx >= boxX &&
    cx <= boxX + CHECKBOX_SIZE + 4 &&
    cy >= boxY &&
    cy <= boxY + CHECKBOX_SIZE + 4
  )
}

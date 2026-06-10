import type { FreezeState, Selection } from '@speed-sheet/shared'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'

export type FreezeMode = 'rows' | 'cols' | 'both'

export type FreezeValidationReason = 'target_not_visible' | 'region_too_large'

export type FreezeValidationResult =
  | { ok: true; xSplit: number; ySplit: number }
  | { ok: false; reason: FreezeValidationReason }

/** 选区右下角（行/列最大值，0-based） */
export function selectionFreezeTarget(selection: Selection): { row: number; col: number } {
  return {
    row: Math.max(selection.row[0], selection.row[1]),
    col: Math.max(selection.column[0], selection.column[1]),
  }
}

export function freezeSplitsFromTarget(
  targetRow: number,
  targetCol: number,
  mode: FreezeMode,
): { xSplit: number; ySplit: number } {
  return {
    xSplit: mode === 'rows' ? 0 : targetCol + 1,
    ySplit: mode === 'cols' ? 0 : targetRow + 1,
  }
}

export function frozenRowPixelHeight(metrics: GridMetrics, ySplit: number): number {
  if (ySplit <= 0) return 0
  return metrics.rowBottom(ySplit - 1) - metrics.rowTop(0)
}

export function frozenColPixelWidth(metrics: GridMetrics, xSplit: number): number {
  if (xSplit <= 0) return 0
  return metrics.colRight(xSplit - 1) - metrics.colLeft(0)
}

export function isFreezeActive(state: FreezeState | null | undefined): boolean {
  if (!state) return false
  return (state.xSplit ?? 0) > 0 || (state.ySplit ?? 0) > 0
}

export interface FreezeViewportInput {
  layout: GridLayout
  metrics: GridMetrics
  scrollX: number
  scrollY: number
  targetRow: number
  targetCol: number
  mode: FreezeMode
}

/** 冻结前视口校验：目标须在可见区内，且冻结区域不得超过视口内容区 */
export function validateFreezeInViewport(input: FreezeViewportInput): FreezeValidationResult {
  const { layout, metrics, scrollX, scrollY, targetRow, targetCol, mode } = input
  const { xSplit, ySplit } = freezeSplitsFromTarget(targetRow, targetCol, mode)

  const contentW = Math.max(0, layout.viewportW - layout.rowHeaderWidth)
  const contentH = Math.max(0, layout.viewportH - layout.columnHeaderHeight)

  if (mode !== 'cols') {
    const rowTop = metrics.rowTop(targetRow)
    const rowBottom = metrics.rowBottom(targetRow)
    const viewTop = scrollY
    const viewBottom = scrollY + contentH
    if (rowBottom <= viewTop || rowTop >= viewBottom) {
      return { ok: false, reason: 'target_not_visible' }
    }
    const frozenH = frozenRowPixelHeight(metrics, ySplit)
    if (frozenH > contentH) {
      return { ok: false, reason: 'region_too_large' }
    }
  }

  if (mode !== 'rows') {
    const colLeft = metrics.colLeft(targetCol)
    const colRight = metrics.colRight(targetCol)
    const viewLeft = scrollX
    const viewRight = scrollX + contentW
    if (colRight <= viewLeft || colLeft >= viewRight) {
      return { ok: false, reason: 'target_not_visible' }
    }
    const frozenW = frozenColPixelWidth(metrics, xSplit)
    if (frozenW > contentW) {
      return { ok: false, reason: 'region_too_large' }
    }
  }

  return { ok: true, xSplit, ySplit }
}

/** 已冻结状态下视口变化：冻结区域是否仍可容纳 */
export function validateExistingFreezeInViewport(
  layout: GridLayout,
  metrics: GridMetrics,
  freeze: FreezeState,
): boolean {
  const contentW = Math.max(0, layout.viewportW - layout.rowHeaderWidth)
  const contentH = Math.max(0, layout.viewportH - layout.columnHeaderHeight)
  const { xSplit = 0, ySplit = 0 } = freeze
  if (ySplit > 0 && frozenRowPixelHeight(metrics, ySplit) > contentH) return false
  if (xSplit > 0 && frozenColPixelWidth(metrics, xSplit) > contentW) return false
  return true
}

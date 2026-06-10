import { MergeContext } from '../../merge'
import type { GridLayout } from '../grid-layout'
import type { GridMetrics } from '../grid-metrics'
import { gridCellX, gridCellY, resolveMetrics } from '../layout-metrics'
import { buildCellMap } from './cell-text'
import { getVisibleRange } from './layout'
import type { CellMap, RenderOptions } from './types'
import type { FreezePaneId } from './freeze-panes'

export interface RenderEnv {
  ctx: CanvasRenderingContext2D
  layout: GridLayout
  options: RenderOptions
  mc: MergeContext
  mergeLookup: MergeContext['lookup']
  M: GridMetrics
  cellMap: CellMap
  vw: number
  vh: number
  RHW: number
  CHH: number
  totalRows: number
  totalCols: number
  sx: number
  sy: number
  rowStart: number
  rowEnd: number
  colStart: number
  colEnd: number
  freezePane: FreezePaneId | 'all'
}

export function createRenderEnv(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions,
): RenderEnv {
  const { layout, cells, merges = [], mergeCtx: mergeCtxIn, selection } = options
  void selection
  const mc = mergeCtxIn ?? MergeContext.fromRanges(merges)
  const {
    totalRows,
    totalCols,
    rowHeaderWidth: RHW,
    columnHeaderHeight: CHH,
    scrollX: sx,
    scrollY: sy,
  } = layout
  const M = resolveMetrics(layout)
  const { rowStart, rowEnd, colStart, colEnd } = getVisibleRange(layout)

  return {
    ctx,
    layout,
    options,
    mc,
    mergeLookup: mc.lookup,
    M,
    cellMap: buildCellMap(cells),
    vw: layout.viewportW,
    vh: layout.viewportH,
    RHW,
    CHH,
    totalRows,
    totalCols,
    sx,
    sy,
    rowStart,
    rowEnd,
    colStart,
    colEnd,
    freezePane: 'all',
  }
}

export { gridCellX, gridCellY }

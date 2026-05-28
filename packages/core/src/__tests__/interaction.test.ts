import { describe, it, expect } from 'vitest'
import {
  resolveMoveRowBlock,
  resolveMoveColBlock,
  resolveResizeRows,
  resolveResizeCols,
  ResizeSession,
  RowMoveSession,
  ColMoveSession,
  buildSelectionAfterRowMove,
  buildSelectionAfterColMove,
  pointerFromCanvasCoords,
  computeRowHeightFromPointer,
  cellPointFromCanvasPointer,
  resolveContextMenuHit,
  resolveKeyboardNav,
} from '../interaction'
import { buildGridMetrics } from '../renderer/grid-metrics'
import { defaultLayout } from '../renderer/canvas-renderer'
import type { Selection } from '@speed-sheet/shared'

describe('selection-block', () => {
  const sel: Selection = {
    row: [2, 4],
    column: [1, 3],
    anchor: { r: 2, c: 1 },
  }

  it('resolveMoveRowBlock moves whole row selection', () => {
    expect(resolveMoveRowBlock(3, sel)).toEqual({ from: 2, count: 3 })
    expect(resolveMoveRowBlock(0, sel)).toEqual({ from: 0, count: 1 })
  })

  it('resolveMoveColBlock moves whole column selection', () => {
    expect(resolveMoveColBlock(2, sel)).toEqual({ from: 1, count: 3 })
    expect(resolveMoveColBlock(0, sel)).toEqual({ from: 0, count: 1 })
  })

  it('resolveResizeRows when handle inside row selection', () => {
    expect(resolveResizeRows(3, sel)).toEqual([2, 3, 4])
    expect(resolveResizeRows(0, sel)).toBeUndefined()
  })

  it('resolveResizeCols when handle inside column selection', () => {
    expect(resolveResizeCols(2, sel)).toEqual([1, 2, 3])
    expect(resolveResizeCols(0, sel)).toBeUndefined()
  })
})

describe('resize session', () => {
  const metrics = buildGridMetrics({
    totalRows: 10,
    totalCols: 5,
    defaultRowHeight: 19,
    defaultColWidth: 73,
  })
  const layout = defaultLayout({ totalRows: 10, totalCols: 5, metrics })

  it('computes row height and guide from pointer', () => {
    const session = new ResizeSession()
    session.start('row', 1)
    const ptr = pointerFromCanvasCoords(10, layout.columnHeaderHeight + 50, layout)
    const preview = session.update(ptr, layout, metrics)!
    expect(preview.axis).toBe('row')
    expect(preview.guidePos).toBeGreaterThan(layout.columnHeaderHeight)

    const commit = session.commit(ptr, layout, metrics, null)!
    expect(commit.axis).toBe('row')
    if (commit.axis === 'row') {
      expect(commit.height).toBe(
        computeRowHeightFromPointer(ptr.contentY, 1, metrics),
      )
    }
  })
})

describe('row move session', () => {
  const metrics = buildGridMetrics({
    totalRows: 10,
    totalCols: 5,
    defaultRowHeight: 19,
    defaultColWidth: 73,
  })
  const layout = defaultLayout({ totalRows: 10, totalCols: 5, metrics })
  const sel: Selection = { row: [1, 2], column: [0, 0], anchor: { r: 1, c: 0 } }

  it('preview and commit row move', () => {
    const session = new RowMoveSession()
    session.start(1, sel)
    const ptr = pointerFromCanvasCoords(5, layout.columnHeaderHeight + 120, layout)
    const preview = session.update(ptr, layout, metrics)!
    expect(preview.hintText).toBe('正在移动 2 行')
    expect(preview.guidePos).toBeGreaterThan(0)

    const commit = session.commit(ptr, layout, metrics, sel)!
    expect(commit.from).toBe(1)
    expect(commit.count).toBe(2)
    expect(commit.selectionAfter).toEqual(
      buildSelectionAfterRowMove(sel, commit.from, commit.count, commit.insertBefore),
    )
  })

  it('preview and commit col move', () => {
    const session = new ColMoveSession()
    const colSel: Selection = { row: [0, 0], column: [1, 2], anchor: { r: 0, c: 1 } }
    session.start(1, colSel)
    const ptr = pointerFromCanvasCoords(layout.rowHeaderWidth + 120, 5, layout)
    const preview = session.update(ptr, layout, metrics)!
    expect(preview.hintText).toBe('正在移动 2 列')
    expect(preview.guidePos).toBeGreaterThan(0)

    const commit = session.commit(ptr, layout, metrics, colSel)!
    expect(commit.from).toBe(1)
    expect(commit.count).toBe(2)
    expect(commit.selectionAfter).toEqual(
      buildSelectionAfterColMove(colSel, commit.from, commit.count, commit.insertBefore),
    )
  })
})

describe('cell pointer & context menu', () => {
  const metrics = buildGridMetrics({
    totalRows: 10,
    totalCols: 5,
    defaultRowHeight: 19,
    defaultColWidth: 73,
  })
  const layout = defaultLayout({ totalRows: 10, totalCols: 5, metrics })

  it('cellPointFromCanvasPointer hits grid body', () => {
    const ptr = pointerFromCanvasCoords(
      layout.rowHeaderWidth + 10,
      layout.columnHeaderHeight + 10,
      layout,
    )
    const pt = cellPointFromCanvasPointer(ptr, layout, metrics)
    expect(pt).toEqual({ r: 0, c: 0 })
  })

  it('resolveContextMenuHit on column header', () => {
    const sel: Selection = { row: [0, 0], column: [0, 0] }
    const ptr = {
      ...pointerFromCanvasCoords(layout.rowHeaderWidth + 40, 5, layout),
      clientX: 100,
      clientY: 50,
    }
    const hit = resolveContextMenuHit(ptr, layout, metrics, sel, null)!
    expect(hit.target).toBe('column')
    expect(hit.action).toEqual({ type: 'select-column', col: 0 })
  })
})

describe('keyboard nav', () => {
  it('resolveKeyboardNav moves and edits', () => {
    expect(resolveKeyboardNav({ key: 'ArrowDown', r: 0, c: 0, totalRows: 10, totalCols: 5 })).toEqual({
      type: 'move',
      r: 1,
      c: 0,
    })
    expect(resolveKeyboardNav({ key: 'Enter', r: 2, c: 1, totalRows: 10, totalCols: 5 })).toEqual({
      type: 'edit',
      r: 2,
      c: 1,
    })
  })
})

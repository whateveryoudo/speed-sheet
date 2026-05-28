import type { Selection } from '@speed-sheet/shared'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import {
  mapRowIndexAfterMove,
  rowMoveGuideCanvasY,
  rowMoveInsertIndex,
} from '../renderer/row-move-hit'
import { resolveMoveRowBlock } from './selection-block'
import type { CanvasPointer } from './pointer'

export type RowMovePreview = {
  insertBefore: number
  guidePos: number
  hintText: string
}

export type RowMoveCommit = {
  from: number
  insertBefore: number
  count: number
  selectionAfter: Selection
}

export function buildSelectionAfterRowMove(
  sel: Selection,
  from: number,
  count: number,
  insertBefore: number,
): Selection {
  const r0 = Math.min(sel.row[0], sel.row[1])
  const r1 = Math.max(sel.row[0], sel.row[1])
  const anchorR = sel.anchor?.r ?? r0
  const anchorC = sel.anchor?.c ?? sel.column[0]
  return {
    row: [
      mapRowIndexAfterMove(r0, from, count, insertBefore),
      mapRowIndexAfterMove(r1, from, count, insertBefore),
    ],
    column: [...sel.column],
    anchor: {
      r: mapRowIndexAfterMove(anchorR, from, count, insertBefore),
      c: anchorC,
    },
  }
}

export function rowMoveHintText(count: number): string {
  return count === 1 ? '正在移动 1 行' : `正在移动 ${count} 行`
}

/** Headless row reorder drag session. */
export class RowMoveSession {
  private from = 0
  private count = 0

  get active(): boolean {
    return this.count > 0
  }

  get block(): { from: number; count: number } {
    return { from: this.from, count: this.count }
  }

  start(startRow: number, selection: Selection | null | undefined): void {
    const block = resolveMoveRowBlock(startRow, selection)
    this.from = block.from
    this.count = block.count
  }

  update(
    pointer: CanvasPointer,
    layout: GridLayout,
    metrics: GridMetrics,
  ): RowMovePreview | null {
    if (!this.active) return null
    const insertBefore = rowMoveInsertIndex(
      pointer.contentY,
      metrics,
      this.from,
      this.count,
    )
    return {
      insertBefore,
      guidePos: rowMoveGuideCanvasY(insertBefore, layout, metrics),
      hintText: rowMoveHintText(this.count),
    }
  }

  commit(
    pointer: CanvasPointer,
    layout: GridLayout,
    metrics: GridMetrics,
    selection: Selection,
  ): RowMoveCommit | null {
    if (!this.active) return null
    const from = this.from
    const count = this.count
    this.cancel()

    const insertBefore = rowMoveInsertIndex(pointer.contentY, metrics, from, count)
    return {
      from,
      insertBefore,
      count,
      selectionAfter: buildSelectionAfterRowMove(selection, from, count, insertBefore),
    }
  }

  cancel(): void {
    this.from = 0
    this.count = 0
  }
}

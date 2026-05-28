import type { Selection } from '@speed-sheet/shared'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import {
  colMoveGuideCanvasX,
  colMoveInsertIndex,
  mapColIndexAfterMove,
} from '../renderer/col-move-hit'
import { resolveMoveColBlock } from './selection-block'
import type { CanvasPointer } from './pointer'

export type ColMovePreview = {
  insertBefore: number
  guidePos: number
  hintText: string
}

export type ColMoveCommit = {
  from: number
  insertBefore: number
  count: number
  selectionAfter: Selection
}

export function buildSelectionAfterColMove(
  sel: Selection,
  from: number,
  count: number,
  insertBefore: number,
): Selection {
  const c0 = Math.min(sel.column[0], sel.column[1])
  const c1 = Math.max(sel.column[0], sel.column[1])
  const anchorR = sel.anchor?.r ?? sel.row[0]
  const anchorC = sel.anchor?.c ?? c0
  return {
    row: [...sel.row],
    column: [
      mapColIndexAfterMove(c0, from, count, insertBefore),
      mapColIndexAfterMove(c1, from, count, insertBefore),
    ],
    anchor: {
      r: anchorR,
      c: mapColIndexAfterMove(anchorC, from, count, insertBefore),
    },
  }
}

export function colMoveHintText(count: number): string {
  return count === 1 ? '正在移动 1 列' : `正在移动 ${count} 列`
}

export class ColMoveSession {
  private from = 0
  private count = 0

  get active(): boolean {
    return this.count > 0
  }

  get block(): { from: number; count: number } {
    return { from: this.from, count: this.count }
  }

  start(startCol: number, selection: Selection | null | undefined): void {
    const block = resolveMoveColBlock(startCol, selection)
    this.from = block.from
    this.count = block.count
  }

  update(
    pointer: CanvasPointer,
    layout: GridLayout,
    metrics: GridMetrics,
  ): ColMovePreview | null {
    if (!this.active) return null
    const insertBefore = colMoveInsertIndex(
      pointer.contentX,
      metrics,
      this.from,
      this.count,
    )
    return {
      insertBefore,
      guidePos: colMoveGuideCanvasX(insertBefore, layout, metrics),
      hintText: colMoveHintText(this.count),
    }
  }

  commit(
    pointer: CanvasPointer,
    layout: GridLayout,
    metrics: GridMetrics,
    selection: Selection,
  ): ColMoveCommit | null {
    if (!this.active) return null
    const from = this.from
    const count = this.count
    this.cancel()

    const insertBefore = colMoveInsertIndex(pointer.contentX, metrics, from, count)
    return {
      from,
      insertBefore,
      count,
      selectionAfter: buildSelectionAfterColMove(selection, from, count, insertBefore),
    }
  }

  cancel(): void {
    this.from = 0
    this.count = 0
  }
}

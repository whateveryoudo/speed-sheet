import type { MergeRange, Selection } from '@speed-sheet/shared'
import type { GridLayout } from '../renderer/grid-layout'
import type { GridMetrics } from '../renderer/grid-metrics'
import {
  buildMergeLookup,
  findMergeMatchingSelection,
  focusPixelRect,
  isMergeInternalColLineAtRow,
  isMergeInternalRowLineAtCol,
  mergePixelRect,
  selectionDisplayBounds,
  selectionRangeForMergeHit,
  type MergeLookup,
} from './layout'

export type MergeHitRange = {
  row: [number, number]
  column: [number, number]
  anchor: { r: number; c: number }
}

export type MergeDisplayBounds = {
  r0: number
  r1: number
  c0: number
  c1: number
}

/**
 * 合并单元格统一门面：读写锚点、命中选区、表头范围、绘制几何。
 * 业务层应通过 SheetState.createMergeContext() 获取，避免散落 buildMergeLookup。
 */
export class MergeContext {
  readonly ranges: readonly MergeRange[]
  readonly lookup: MergeLookup

  private constructor(ranges: MergeRange[]) {
    this.ranges = ranges
    this.lookup = buildMergeLookup(ranges)
  }

  static fromRanges(ranges: MergeRange[]): MergeContext {
    return new MergeContext(ranges)
  }

  static empty(): MergeContext {
    return new MergeContext([])
  }

  get isEmpty(): boolean {
    return this.ranges.length === 0
  }

  /** 覆盖 (r,c) 的合并区；无则 undefined */
  at(r: number, c: number): MergeRange | undefined {
    return this.lookup.at(r, c)
  }

  isSlave(r: number, c: number): boolean {
    return this.lookup.isSlave(r, c)
  }

  /** 数据读写、公式、编辑落点 */
  anchor(r: number, c: number): { r: number; c: number } {
    const m = this.lookup.at(r, c)
    if (m) return { r: m.r, c: m.c }
    return { r, c }
  }

  /** 点击 (r,c) 应对齐的选区（含整块 merge） */
  rangeForHit(r: number, c: number): MergeHitRange {
    return selectionRangeForMergeHit(r, c, this.lookup)
  }

  /** 表头高亮、插入/删除行列计数 */
  displayBounds(selection: Selection): MergeDisplayBounds {
    return selectionDisplayBounds(selection, this.lookup)
  }

  rowCountForSelection(selection: Selection): number {
    const { r0, r1 } = this.displayBounds(selection)
    return r1 - r0 + 1
  }

  colCountForSelection(selection: Selection): number {
    const { c0, c1 } = this.displayBounds(selection)
    return c1 - c0 + 1
  }

  findMatchingSelection(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
  ): MergeRange | undefined {
    return findMergeMatchingSelection(r0, c0, r1, c1, [...this.ranges])
  }

  isRealMerge(m: MergeRange | undefined): boolean {
    return m != null && (m.rs > 1 || m.cs > 1)
  }

  /** 焦点格上的合并区（用于右键「拆分」） */
  mergeAtFocus(selection: Selection): MergeRange | undefined {
    const ar = selection.anchor?.r ?? selection.row[0]
    const ac = selection.anchor?.c ?? selection.column[0]
    const m = this.lookup.at(ar, ac)
    return this.isRealMerge(m) ? m : undefined
  }

  pixelRect(
    m: MergeRange,
    layout: GridLayout,
    M: GridMetrics,
  ): { x: number; y: number; w: number; h: number } {
    return mergePixelRect(m, layout, M)
  }

  pixelRectAtCell(
    r: number,
    c: number,
    layout: GridLayout,
    M: GridMetrics,
  ): { x: number; y: number; w: number; h: number } {
    const m = this.lookup.at(r, c)
    if (m) return mergePixelRect(m, layout, M)
    return focusPixelRect(r, c, layout, M, this.lookup)
  }

  focusPixelRect(
    r: number,
    c: number,
    layout: GridLayout,
    M: GridMetrics,
  ): { x: number; y: number; w: number; h: number } {
    return focusPixelRect(r, c, layout, M, this.lookup)
  }

  isInternalColLineAtRow(lineCol: number, row: number): boolean {
    return isMergeInternalColLineAtRow(lineCol, row, [...this.ranges])
  }

  isInternalRowLineAtCol(lineRow: number, col: number): boolean {
    return isMergeInternalRowLineAtCol(lineRow, col, [...this.ranges])
  }

  /**
   * 选区与某 merge 相交但不完全包含（Luckysheet hasPartMC，粘贴/排序前校验）。
   */
  hasPartialMergeInRect(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
  ): boolean {
    const rMin = Math.min(r0, r1)
    const rMax = Math.max(r0, r1)
    const cMin = Math.min(c0, c1)
    const cMax = Math.max(c0, c1)

    for (const m of this.ranges) {
      if (m.rs <= 1 && m.cs <= 1) continue
      const mr1 = m.r + m.rs - 1
      const mc1 = m.c + m.cs - 1
      const intersects =
        m.r <= rMax &&
        mr1 >= rMin &&
        m.c <= cMax &&
        mc1 >= cMin
      if (!intersects) continue
      const contains =
        m.r >= rMin &&
        mr1 <= rMax &&
        m.c >= cMin &&
        mc1 <= cMax
      if (!contains) return true
    }
    return false
  }
}

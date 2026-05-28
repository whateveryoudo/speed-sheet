import type { CellPoint } from './cell-pointer'

export type SelectRangePayload = {
  anchor: CellPoint
  row: [number, number]
  column: [number, number]
}

/** Headless cell range drag (mousedown anchor → mousemove extends selection). */
export class SelectDragSession {
  private anchor: CellPoint | null = null

  get active(): boolean {
    return this.anchor != null
  }

  start(r: number, c: number): void {
    this.anchor = { r, c }
  }

  update(pt: CellPoint): SelectRangePayload | null {
    if (!this.anchor) return null
    const a = this.anchor
    return {
      anchor: a,
      row: [a.r, pt.r],
      column: [a.c, pt.c],
    }
  }

  cancel(): void {
    this.anchor = null
  }
}

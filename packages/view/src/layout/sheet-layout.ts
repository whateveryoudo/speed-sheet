import {
  defaultLayout,
  buildGridMetrics,
  buildSheetGridMetrics,
  type GridLayout,
  type GridMetrics,
  type Sheet,
} from '@speed-sheet/core'

export type SheetLayoutOptions = {
  getSheet: () => Sheet | null
  getRevision: () => number
  getRowHeaderWidth?: () => number | undefined
  getColumnHeaderHeight?: () => number | undefined
}

export class SheetLayoutState {
  scrollX = 0
  scrollY = 0
  layout: GridLayout

  constructor(private readonly options: SheetLayoutOptions) {
    this.layout = defaultLayout({
      ...(options.getRowHeaderWidth?.() != null
        ? { rowHeaderWidth: options.getRowHeaderWidth!() }
        : {}),
      ...(options.getColumnHeaderHeight?.() != null
        ? { columnHeaderHeight: options.getColumnHeaderHeight!() }
        : {}),
    })
  }

  get gridMetrics(): GridMetrics {
    void this.options.getRevision()
    const s = this.options.getSheet()
    if (!s) {
      return buildGridMetrics({
        totalRows: this.layout.totalRows,
        totalCols: this.layout.totalCols,
        defaultRowHeight: this.layout.defaultRowHeight,
        defaultColWidth: this.layout.defaultColWidth,
      })
    }
    return buildSheetGridMetrics(s, this.layout)
  }

  get totalRows(): number {
    return this.gridMetrics.totalRows
  }

  get totalCols(): number {
    return this.gridMetrics.totalCols
  }

  get totalW(): number {
    return this.layout.rowHeaderWidth + this.gridMetrics.totalWidth
  }

  get totalH(): number {
    return this.layout.columnHeaderHeight + this.gridMetrics.totalHeight
  }

  layoutForHit(): GridLayout {
    const freeze = this.options.getSheet()?.state.getFreezeState() ?? this.layout.freeze ?? null
    return {
      ...this.layout,
      scrollX: this.scrollX,
      scrollY: this.scrollY,
      metrics: this.gridMetrics,
      totalRows: this.totalRows,
      totalCols: this.totalCols,
      freeze,
    }
  }

  applyHeaderSizes(): void {
    this.layout = {
      ...this.layout,
      ...(this.options.getRowHeaderWidth?.() != null
        ? { rowHeaderWidth: this.options.getRowHeaderWidth!() }
        : {}),
      ...(this.options.getColumnHeaderHeight?.() != null
        ? { columnHeaderHeight: this.options.getColumnHeaderHeight!() }
        : {}),
    }
  }
}

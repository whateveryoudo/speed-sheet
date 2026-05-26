import * as Y from 'yjs'
import { cellKey } from '@speed-sheet/shared'
import type { CellAttributes, SheetConfig, Selection, SheetSnapshot } from '@speed-sheet/shared'

/**
 * SheetState wraps a Y.Doc for an individual sheet.
 * All mutations go through Yjs, enabling CRDT sync out of the box.
 */
export class SheetState {
  public root: Y.Map<any>

  constructor(existing?: Y.Map<any>) {
    this.root = existing ?? new Y.Map()

    // Ensure substructures exist
    if (!this.root.has('cells')) this.root.set('cells', new Y.Map())
    if (!this.root.has('merges')) this.root.set('merges', new Y.Map())
    if (!this.root.has('rowHeight')) this.root.set('rowHeight', new Y.Map())
    if (!this.root.has('colWidth')) this.root.set('colWidth', new Y.Map())
    if (!this.root.has('rowHidden')) this.root.set('rowHidden', new Y.Map())
    if (!this.root.has('colHidden')) this.root.set('colHidden', new Y.Map())
    if (!this.root.has('freeze')) this.root.set('freeze', new Y.Map())
  }

  // ---- Cells ----

  get cells(): Y.Map<any> {
    return this.root.get('cells') as Y.Map<any>
  }

  getCell(r: number, c: number): Y.Map<any> | undefined {
    return this.cells.get(cellKey(r, c))
  }

  getCellData(r: number, c: number): CellAttributes | null {
    const cell = this.getCell(r, c)
    if (!cell) return null
    return cell.toJSON() as CellAttributes
  }

  setCell(r: number, c: number, data: Partial<CellAttributes>): void {
    let cell: Y.Map<any>
    const key = cellKey(r, c)

    if (this.cells.has(key)) {
      cell = this.cells.get(key) as Y.Map<any>
    } else {
      cell = new Y.Map()
      this.cells.set(key, cell)
    }

    this.cells.doc?.transact(() => {
      for (const [field, value] of Object.entries(data)) {
        if (value === undefined || value === null) {
          cell.delete(field)
        } else {
          cell.set(field, value)
        }
      }
    })
  }

  deleteCell(r: number, c: number): void {
    this.cells.delete(cellKey(r, c))
  }

  /** 在 atRow 处插入 count 行（该行及下方下移） */
  insertRows(atRow: number, count = 1): void {
    if (count <= 0) return
    this.remapAllCells((r, c) => ({ r: r >= atRow ? r + count : r, c }))
    this.shiftIndexMap(this.rowHeight, atRow, count)
    this.shiftIndexMap(this.rowHidden, atRow, count)
  }

  /** 删除从 atRow 开始的 count 行 */
  deleteRows(atRow: number, count = 1): void {
    if (count <= 0) return
    this.remapAllCells((r, c) => {
      if (r >= atRow && r < atRow + count) return null
      if (r >= atRow + count) return { r: r - count, c }
      return { r, c }
    })
    this.shiftIndexMap(this.rowHeight, atRow, -count, count)
    this.shiftIndexMap(this.rowHidden, atRow, -count, count)
  }

  /** 在 atCol 处插入 count 列 */
  insertCols(atCol: number, count = 1): void {
    if (count <= 0) return
    this.remapAllCells((r, c) => ({ r, c: c >= atCol ? c + count : c }))
    this.shiftIndexMap(this.colWidth, atCol, count)
    this.shiftIndexMap(this.colHidden, atCol, count)
  }

  /** 删除从 atCol 开始的 count 列 */
  deleteCols(atCol: number, count = 1): void {
    if (count <= 0) return
    this.remapAllCells((r, c) => {
      if (c >= atCol && c < atCol + count) return null
      if (c >= atCol + count) return { r, c: c - count }
      return { r, c }
    })
    this.shiftIndexMap(this.colWidth, atCol, -count, count)
    this.shiftIndexMap(this.colHidden, atCol, -count, count)
  }

  /** 合并矩形选区为单个 merge 块（左上角为锚点） */
  mergeCells(r0: number, c0: number, r1: number, c1: number): void {
    const r = Math.min(r0, r1)
    const c = Math.min(c0, c1)
    const rs = Math.abs(r1 - r0) + 1
    const cs = Math.abs(c1 - c0) + 1
    if (rs <= 1 && cs <= 1) return
    const key = `${r}_${c}`
    this.root.doc?.transact(() => {
      this.merges.set(key, { r, c, rs, cs })
    })
  }

  private remapAllCells(
    mapPos: (r: number, c: number) => { r: number; c: number } | null,
  ): void {
    const all = this.getAllCells()
    this.root.doc?.transact(() => {
      this.cells.clear()
      for (const { r, c, data } of all) {
        const next = mapPos(r, c)
        if (!next) continue
        const key = cellKey(next.r, next.c)
        const cell = new Y.Map()
        for (const [field, value] of Object.entries(data)) {
          if (value !== undefined && value !== null) cell.set(field, value)
        }
        this.cells.set(key, cell)
      }
    })
  }

  private shiftIndexMap(
    map: Y.Map<number>,
    at: number,
    delta: number,
    deleteCount = 0,
  ): void {
    const entries: Array<[string, number]> = []
    map.forEach((v, k) => entries.push([k, v]))
    map.doc?.transact(() => {
      map.clear()
      for (const [k, v] of entries) {
        const idx = parseInt(k, 10)
        if (Number.isNaN(idx)) {
          map.set(k, v)
          continue
        }
        if (deleteCount > 0 && idx >= at && idx < at + deleteCount) continue
        let ni = idx
        if (deleteCount > 0 && idx >= at + deleteCount) ni = idx + delta
        else if (deleteCount === 0 && idx >= at) ni = idx + delta
        if (ni >= 0) map.set(String(ni), v)
      }
    })
  }

  getAllCells(): Array<{ r: number; c: number; data: CellAttributes }> {
    const result: Array<{ r: number; c: number; data: CellAttributes }> = []
    this.cells.forEach((cell: Y.Map<any>, key: string) => {
      // Use shared parseCellKey or inline
      const [, rs, cs] = key.match(/R(\d+)_C(\d+)/) ?? []
      if (rs && cs) {
        result.push({ r: parseInt(rs), c: parseInt(cs), data: cell.toJSON() as CellAttributes })
      }
    })
    return result
  }

  // ---- Config accessors ----

  get merges(): Y.Map<any> { return this.root.get('merges') as Y.Map<any> }
  get rowHeight(): Y.Map<number> { return this.root.get('rowHeight') as Y.Map<number> }
  get colWidth(): Y.Map<number> { return this.root.get('colWidth') as Y.Map<number> }
  get rowHidden(): Y.Map<number> { return this.root.get('rowHidden') as Y.Map<number> }
  get colHidden(): Y.Map<number> { return this.root.get('colHidden') as Y.Map<number> }
  get freeze(): Y.Map<number> { return this.root.get('freeze') as Y.Map<number> }

  // ---- Selection ----

  setSelection(sel: Selection): void {
    if (!this.root.has('_selection')) {
      this.root.set('_selection', new Y.Map())
    }
    const s = this.root.get('_selection') as Y.Map<any>
    const anchor = sel.anchor ?? { r: sel.row[0], c: sel.column[0] }
    this.root.doc?.transact(() => {
      s.set('r0', sel.row[0])
      s.set('r1', sel.row[1])
      s.set('c0', sel.column[0])
      s.set('c1', sel.column[1])
      s.set('ar', anchor.r)
      s.set('ac', anchor.c)
    })
  }

  getSelection(): Selection {
    if (!this.root.has('_selection')) {
      return { row: [0, 0], column: [0, 0], anchor: { r: 0, c: 0 } }
    }
    const s = this.root.get('_selection') as Y.Map<any>
    const r0 = s.get('r0') ?? 0
    const c0 = s.get('c0') ?? 0
    return {
      row: [r0, s.get('r1') ?? 0],
      column: [c0, s.get('c1') ?? 0],
      anchor: { r: s.get('ar') ?? r0, c: s.get('ac') ?? c0 },
    }
  }

  // ---- Snapshot export ----

  toSnapshot(id: string, name: string): SheetSnapshot {
    const cells: Record<string, CellAttributes> = {}
    this.cells.forEach((cell: Y.Map<any>, key: string) => {
      cells[key] = cell.toJSON() as CellAttributes
    })

    return {
      id,
      name,
      order: 0,
      cells,
      config: {
        merges: this.merges.toJSON(),
        rowHeight: this.rowHeight.toJSON(),
        colWidth: this.colWidth.toJSON(),
        rowHidden: this.rowHidden.toJSON(),
        colHidden: this.colHidden.toJSON(),
        borders: [],
        filters: [],
        freeze: this.freeze.toJSON() as any,
      },
    }
  }
}

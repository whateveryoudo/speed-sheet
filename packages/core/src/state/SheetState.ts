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
    this.root.doc?.transact(() => {
      s.set('r0', sel.row[0])
      s.set('r1', sel.row[1])
      s.set('c0', sel.column[0])
      s.set('c1', sel.column[1])
    })
  }

  getSelection(): Selection {
    if (!this.root.has('_selection')) {
      return { row: [0, 0], column: [0, 0] }
    }
    const s = this.root.get('_selection') as Y.Map<any>
    return {
      row: [s.get('r0') ?? 0, s.get('r1') ?? 0],
      column: [s.get('c0') ?? 0, s.get('c1') ?? 0],
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

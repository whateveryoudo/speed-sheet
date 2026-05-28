import * as Y from 'yjs'
import type {
  LuckysheetFile,
  LuckysheetSheet,
  CellAttributes,
  MergeRange,
  SheetSnapshot,
  WorkbookSnapshot,
} from '@speed-sheet/shared'
import { initLayoutFromRcEntries } from '../state/sheet-layout'
import { SheetState } from '../state/SheetState'
import { transactSystem } from '../yjs/transact'

// ============================================================
// Adapter: Old Luckysheet format ↔ Yjs CRDT model
// ============================================================

/**
 * Import old Luckysheet format into a Y.Doc.
 *
 * Mapping:
 *   oldSheet.data[row][col] → Y.Map cells.set("R{row}_C{col}", Y.Map(cellAttrs))
 *   oldSheet.config.merge     → ySheet.set("merges", Y.Map)
 *   oldSheet.config.rowlen    → ySheet.set("rowHeight", Y.Map)
 *   oldSheet.config.columnlen → ySheet.set("colWidth", Y.Map)
 *   oldSheet.config.rowhidden → ySheet.set("rowHidden", Y.Map)
 *   oldSheet.config.colhidden → ySheet.set("colHidden", Y.Map)
 */
export function importFromLuckysheet(
  oldFile: LuckysheetFile,
  ydoc: Y.Doc,
): void {
  const ySheets = ydoc.getMap('sheets')

  transactSystem(ydoc, () => {
    for (let i = 0; i < oldFile.length; i++) {
      const oldSheet = oldFile[i]
      const sheetId = oldSheet.index?.toString() ?? i.toString()
      const ySheet = new Y.Map()
      ySheets.set(sheetId, ySheet)

      // Name
      ySheet.set('name', oldSheet.name ?? `Sheet${i + 1}`)

      // Cells — stable rowId:colId layout (v2); ySheet must be in doc before Y.Array ops
      const cellEntries = collectCellEntries(oldSheet)
      initLayoutFromRcEntries(ySheet as Y.Map<unknown>, cellEntries, {
        rowCount: oldSheet.row,
        colCount: oldSheet.column,
      })

      // Config
      if (oldSheet.config) {
        ySheet.set('merges', simplifyMergeMap(oldSheet.config.merge ?? {}))
        ySheet.set('rowHeight', recordToYMap(oldSheet.config.rowlen ?? {}))
        ySheet.set('colWidth', recordToYMap(oldSheet.config.columnlen ?? {}))
        ySheet.set('rowHidden', recordToYMap(oldSheet.config.rowhidden ?? {}))
        ySheet.set('colHidden', recordToYMap(oldSheet.config.colhidden ?? {}))
      } else {
        ySheet.set('merges', new Y.Map())
        ySheet.set('rowHeight', new Y.Map())
        ySheet.set('colWidth', new Y.Map())
        ySheet.set('rowHidden', new Y.Map())
        ySheet.set('colHidden', new Y.Map())
      }

      ySheet.set('freeze', recordToYMap(oldSheet.config?.freezen ?? {}))

      if (!oldSheet.hide) {
        ySheet.set('hidden', false)
      } else {
        ySheet.set('hidden', oldSheet.hide === 1)
      }
    }
  })
}

/**
 * Export Y.Doc back to old Luckysheet format for compatibility.
 */
export function exportToLuckysheet(ydoc: Y.Doc): LuckysheetFile {
  const ySheets = ydoc.getMap('sheets')
  const result: LuckysheetFile = []

  ySheets.forEach((value, sheetId) => {
    const ySheet = value as Y.Map<any>
    const name: string = ySheet.get('name') ?? 'Sheet'
    const hidden: boolean = ySheet.get('hidden') ?? false
    const state = new SheetState(ySheet as Y.Map<unknown>)
    const merges = ySheet.get('merges') as Y.Map<any>
    const rowHeight = ySheet.get('rowHeight') as Y.Map<number>
    const colWidth = ySheet.get('colWidth') as Y.Map<number>
    const rowHidden = ySheet.get('rowHidden') as Y.Map<number>
    const colHidden = ySheet.get('colHidden') as Y.Map<number>
    const freeze = ySheet.get('freeze') as Y.Map<number>

    const { data } = cellsToGrid(state.getAllCells())

    // Convert merges back to luckysheet format
    const merge: Record<string, MergeRange> = {}
    if (merges) {
      merges.forEach((val: any, key: string) => {
        merge[key] = typeof val === 'object' ? val : JSON.parse(val)
      })
    }

    result.push({
      name,
      index: parseInt(sheetId, 10),
      order: parseInt(sheetId, 10),
      status: '1',
      hide: hidden ? 1 : 0,
      data,
      config: {
        merge,
        rowlen: yMapToRecord(rowHeight),
        columnlen: yMapToRecord(colWidth),
        rowhidden: yMapToRecord(rowHidden),
        colhidden: yMapToRecord(colHidden),
        freezen: yMapToRecord(freeze) as any,
      },
    })
  })

  return result
}

/** One-shot: Luckysheet file → v2 WorkbookSnapshot (import/export without keeping Y.Doc). */
export function luckysheetFileToSnapshot(file: LuckysheetFile): WorkbookSnapshot {
  const ydoc = new Y.Doc()
  importFromLuckysheet(file, ydoc)
  const sheetsMap = ydoc.getMap('sheets')
  const sheets: SheetSnapshot[] = []
  sheetsMap.forEach((value, id) => {
    const ySheet = value as Y.Map<any>
    const state = new SheetState(ySheet)
    sheets.push(state.toSnapshot(id, (ySheet.get('name') as string) ?? ''))
  })
  ydoc.destroy()
  return {
    version: 2,
    sheets,
    activeSheetId: sheets[0]?.id ?? '0',
  }
}

// ---- Convert old sheet cells ----

function collectCellEntries(
  oldSheet: LuckysheetSheet,
): Array<{ r: number; c: number; cell: Y.Map<unknown> }> {
  const entries: Array<{ r: number; c: number; cell: Y.Map<unknown> }> = []

  if (oldSheet.celldata && oldSheet.celldata.length > 0) {
    for (const item of oldSheet.celldata) {
      entries.push({ r: item.r, c: item.c, cell: valueToYMap(item.v) })
    }
    return entries
  }

  if (oldSheet.data && oldSheet.data.length > 0) {
    for (let r = 0; r < oldSheet.data.length; r++) {
      const row = oldSheet.data[r]
      if (!row) continue
      for (let c = 0; c < row.length; c++) {
        const cell = row[c]
        if (cell == null || cell === '') continue
        entries.push({ r, c, cell: valueToYMap(cell) })
      }
    }
  }
  return entries
}

function valueToYMap(
  v: string | number | boolean | Record<string, any> | null,
): Y.Map<any> {
  const map = new Y.Map()
  if (v == null) return map

  if (typeof v === 'object') {
    // Already a cell object: { v, f, m, ct, fc, bg, ... }
    for (const [k, val] of Object.entries(v)) {
      if (val !== null && val !== undefined) {
        map.set(k, val)
      }
    }
  } else {
    // Plain value
    map.set('v', v)
    map.set('m', String(v))
  }
  return map
}

// ---- Grid conversion ----

function cellsToGrid(cells: Array<{ r: number; c: number; data: CellAttributes }>): {
  data: (CellAttributes | null)[][]
  maxR: number
  maxC: number
} {
  let maxR = 0
  let maxC = 0
  for (const { r, c } of cells) {
    maxR = Math.max(maxR, r)
    maxC = Math.max(maxC, c)
  }
  const data: (CellAttributes | null)[][] = Array.from({ length: maxR + 1 }, () =>
    Array(maxC + 1).fill(null),
  )
  for (const { r, c, data: cell } of cells) {
    data[r][c] = cell
  }
  return { data, maxR, maxC }
}

// ---- Y.Map ↔ Record ----

function recordToYMap(record: Record<string, any>): Y.Map<any> {
  const map = new Y.Map()
  if (record) {
    for (const [k, v] of Object.entries(record)) {
      map.set(k, v)
    }
  }
  return map
}

function yMapToRecord(map: Y.Map<any>): Record<string, any> {
  const record: Record<string, any> = {}
  if (map) {
    map.forEach((val: any, key: string) => {
      record[key] = val
    })
  }
  return record
}

// Simplify merge map: luckysheet uses nested objects for merge ranges,
// but sometimes the value is directly the MergeRange object.
function simplifyMergeMap(
  merge: Record<string, any>,
): Y.Map<any> {
  const map = new Y.Map()
  for (const [key, val] of Object.entries(merge)) {
    if (val && typeof val === 'object' && val.r !== undefined) {
      map.set(key, val as MergeRange)
    } else {
      map.set(key, val)
    }
  }
  return map
}

import * as Y from 'yjs'
import { allocColId, allocRowId, cellIdKey, parseCellIdKey } from '@speed-sheet/shared'
import type { CellAttributes } from '@speed-sheet/shared'

export const DEFAULT_ROW_COUNT = 200
export const DEFAULT_COL_COUNT = 26

export type IdIndex = Map<string, number>

/** Build rowId/colId → display index maps from Y.Array order lists. */
export function buildIdIndexes(rowOrder: Y.Array<string>, colOrder: Y.Array<string>): {
  rowIndex: IdIndex
  colIndex: IdIndex
} {
  const rowIndex: IdIndex = new Map()
  const colIndex: IdIndex = new Map()
  rowOrder.forEach((id, r) => rowIndex.set(id, r))
  colOrder.forEach((id, c) => colIndex.set(id, c))
  return { rowIndex, colIndex }
}

export function allocId(_root: Y.Map<unknown>, prefix: 'row' | 'col'): string {
  return prefix === 'row' ? allocRowId() : allocColId()
}

/** Create rowOrder/colOrder for [0..rowCount) and [0..colCount). */
export function createOrderArrays(
  root: Y.Map<unknown>,
  rowCount: number,
  colCount: number,
): { rowOrder: Y.Array<string>; colOrder: Y.Array<string> } {
  const rowOrder = new Y.Array<string>()
  const colOrder = new Y.Array<string>()
  root.set('rowOrder', rowOrder)
  root.set('colOrder', colOrder)

  const rowIds: string[] = []
  const colIds: string[] = []
  for (let r = 0; r < rowCount; r++) rowIds.push(allocId(root, 'row'))
  for (let c = 0; c < colCount; c++) colIds.push(allocId(root, 'col'))

  const apply = (): void => {
    rowOrder.insert(0, rowIds)
    colOrder.insert(0, colIds)
  }
  if (root.doc) root.doc.transact(apply)
  else apply()

  return { rowOrder, colOrder }
}

export function ensureLayoutOnSheet(root: Y.Map<unknown>): void {
  if (root.has('rowOrder') && root.has('colOrder')) return

  createOrderArrays(root, DEFAULT_ROW_COUNT, DEFAULT_COL_COUNT)
  root.set('meta', new Y.Map([['rowCount', DEFAULT_ROW_COUNT], ['colCount', DEFAULT_COL_COUNT]]))
}

/** Import helper: write stable-id layout directly from sparse (r,c) list. */
export function initLayoutFromRcEntries(
  root: Y.Map<unknown>,
  entries: Array<{ r: number; c: number; cell: Y.Map<unknown> }>,
  size?: { rowCount?: number; colCount?: number },
): void {
  let maxR = 0
  let maxC = 0
  for (const { r, c } of entries) {
    maxR = Math.max(maxR, r)
    maxC = Math.max(maxC, c)
  }
  const rowCount = Math.max(size?.rowCount ?? 0, maxR + 1, DEFAULT_ROW_COUNT)
  const colCount = Math.max(size?.colCount ?? 0, maxC + 1, DEFAULT_COL_COUNT)

  const { rowOrder, colOrder } = createOrderArrays(root, rowCount, colCount)
  const rowIds = rowOrder.toArray()
  const colIds = colOrder.toArray()
  const cells = new Y.Map<Y.Map<unknown>>()

  for (const { r, c, cell } of entries) {
    cells.set(cellIdKey(rowIds[r]!, colIds[c]!), cell)
  }

  root.set('cells', cells)
  const meta = new Y.Map<unknown>()
  meta.set('rowCount', rowCount)
  meta.set('colCount', colCount)
  root.set('meta', meta)
}

export function deleteCellsForRowId(cells: Y.Map<Y.Map<unknown>>, rowId: string): void {
  const prefix = `${rowId}:`
  const toDelete: string[] = []
  cells.forEach((_, key) => {
    if (key.startsWith(prefix)) toDelete.push(key)
  })
  for (const key of toDelete) cells.delete(key)
}

export function deleteCellsForColId(cells: Y.Map<Y.Map<unknown>>, colId: string): void {
  const suffix = `:${colId}`
  const toDelete: string[] = []
  cells.forEach((_, key) => {
    if (key.endsWith(suffix)) toDelete.push(key)
  })
  for (const key of toDelete) cells.delete(key)
}

/** Snapshot export: cells keyed by `rowId:colId`. */
export function cellsToIdRecord(
  cells: Y.Map<Y.Map<unknown>>,
): Record<string, CellAttributes> {
  const out: Record<string, CellAttributes> = {}
  cells.forEach((cell, key) => {
    if (!parseCellIdKey(key)) return
    out[key] = cell.toJSON() as CellAttributes
  })
  return out
}

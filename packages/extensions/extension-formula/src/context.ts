import * as Y from 'yjs'
import type { Sheet } from '@speed-sheet/core'
import { SheetState, buildIdIndexes } from '@speed-sheet/core'
import { depKey } from '@speed-sheet/shared'

export interface FormulaContext {
  readonly activeSheetId: string
  resolveSheetId(nameOrId: string | undefined): string | null
  getSheetName(sheetId: string): string
  resolveCellIds(sheetId: string, r: number, c: number): { rowId: string; colId: string } | null
  idsToDisplay(sheetId: string, rowId: string, colId: string): { r: number; c: number } | null
  expandIdRange(
    sheetId: string,
    rowId0: string,
    colId0: string,
    rowId1: string,
    colId1: string,
  ): Array<{ rowId: string; colId: string }>
  /** Scalar by stable ids (canonical for evaluation). */
  getScalarById(
    sheetId: string,
    rowId: string,
    colId: string,
    visiting: Set<string>,
  ): number | string | boolean | null
  /** Display-coordinate scalar (A1 boundary only). */
  getScalar(sheetId: string, r: number, c: number, visiting: Set<string>): number | string | boolean | null
}

function getSheetState(sheetsMap: Y.Map<unknown>, sheetId: string): SheetState | null {
  const ySheet = sheetsMap.get(sheetId) as Y.Map<unknown> | undefined
  if (!ySheet) return null
  return new SheetState(ySheet as Y.Map<unknown> as Y.Map<Y.Map<unknown>>)
}

export function createFormulaContext(sheet: Sheet): FormulaContext {
  const ydoc = sheet.ydoc
  const sheetsMap = ydoc.getMap('sheets')

  return {
    activeSheetId: sheet.getActiveSheetId(),

    getSheetName(sheetId: string): string {
      const ySheet = sheetsMap.get(sheetId) as Y.Map<unknown> | undefined
      return (ySheet?.get('name') as string) ?? sheetId
    },

    resolveSheetId(nameOrId: string | undefined): string | null {
      if (!nameOrId) return sheet.getActiveSheetId()
      if (sheetsMap.has(nameOrId)) return nameOrId
      for (const id of sheet.getSheetIds()) {
        const ySheet = sheetsMap.get(id) as Y.Map<unknown> | undefined
        const name = ySheet?.get('name') as string | undefined
        if (name === nameOrId) return id
      }
      return null
    },

    resolveCellIds(sheetId: string, r: number, c: number): { rowId: string; colId: string } | null {
      const state = getSheetState(sheetsMap, sheetId)
      return state?.resolveCellIds(r, c) ?? null
    },

    idsToDisplay(sheetId: string, rowId: string, colId: string): { r: number; c: number } | null {
      const state = getSheetState(sheetsMap, sheetId)
      if (!state) return null
      const { rowIndex, colIndex } = buildIdIndexes(state.rowOrder, state.colOrder)
      const r = rowIndex.get(rowId)
      const c = colIndex.get(colId)
      if (r === undefined || c === undefined) return null
      return { r, c }
    },

    expandIdRange(
      sheetId: string,
      rowId0: string,
      colId0: string,
      rowId1: string,
      colId1: string,
    ): Array<{ rowId: string; colId: string }> {
      const state = getSheetState(sheetsMap, sheetId)
      if (!state) return []
      const { rowIndex, colIndex } = buildIdIndexes(state.rowOrder, state.colOrder)
      const r0 = rowIndex.get(rowId0)
      const c0 = colIndex.get(colId0)
      const r1 = rowIndex.get(rowId1)
      const c1 = colIndex.get(colId1)
      if (r0 === undefined || c0 === undefined || r1 === undefined || c1 === undefined) return []

      const out: Array<{ rowId: string; colId: string }> = []
      const ra = Math.min(r0, r1)
      const rb = Math.max(r0, r1)
      const ca = Math.min(c0, c1)
      const cb = Math.max(c0, c1)
      for (let r = ra; r <= rb; r++) {
        for (let c = ca; c <= cb; c++) {
          const rowId = state.rowOrder.get(r)
          const colId = state.colOrder.get(c)
          if (rowId && colId) out.push({ rowId, colId })
        }
      }
      return out
    },

    getScalarById(
      sheetId: string,
      rowId: string,
      colId: string,
      visiting: Set<string>,
    ): number | string | boolean | null {
      const visitKey = depKey(sheetId, rowId, colId)
      if (visiting.has(visitKey)) return null

      const state = getSheetState(sheetsMap, sheetId)
      if (!state) return null

      const { rowIndex, colIndex } = buildIdIndexes(state.rowOrder, state.colOrder)
      const r = rowIndex.get(rowId)
      const c = colIndex.get(colId)
      if (r === undefined || c === undefined) return null

      const data = state.getCellData(r, c)
      if (!data) return null
      const v = data.v
      if (v === null || v === undefined) return null
      return v
    },

    getScalar(
      sheetId: string,
      r: number,
      c: number,
      visiting: Set<string>,
    ): number | string | boolean | null {
      const ids = this.resolveCellIds(sheetId, r, c)
      if (!ids) return null
      return this.getScalarById(sheetId, ids.rowId, ids.colId, visiting)
    },
  }
}

export function scalarToDisplay(v: number | string | boolean | null): string {
  if (v === null) return ''
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  return String(v)
}

export function coerceNumber(v: number | string | boolean | null): number {
  if (v === null || v === '') return 0
  if (typeof v === 'boolean') return v ? 1 : 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function collectRangeScalars(
  ctx: FormulaContext,
  sheetId: string,
  row: [number, number],
  column: [number, number],
  visiting: Set<string>,
): number[] {
  const out: number[] = []
  for (let r = row[0]; r <= row[1]; r++) {
    for (let c = column[0]; c <= column[1]; c++) {
      out.push(coerceNumber(ctx.getScalar(sheetId, r, c, visiting)))
    }
  }
  return out
}

export function collectIdRangeScalars(
  ctx: FormulaContext,
  sheetId: string,
  rowId0: string,
  colId0: string,
  rowId1: string,
  colId1: string,
  visiting: Set<string>,
): number[] {
  const cells = ctx.expandIdRange(sheetId, rowId0, colId0, rowId1, colId1)
  return cells.map(({ rowId, colId }) =>
    coerceNumber(ctx.getScalarById(sheetId, rowId, colId, visiting)),
  )
}

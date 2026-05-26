import * as Y from 'yjs'
import type { Sheet } from '@speed-sheet/core'
import { SheetState } from '@speed-sheet/core'
import { cellKey } from '@speed-sheet/shared'

export interface FormulaContext {
  readonly activeSheetId: string
  resolveSheetId(nameOrId: string | undefined): string | null
  getSheetName(sheetId: string): string
  /** 取单元格用于计算的标量（优先已计算 v，不递归展开公式链） */
  getScalar(sheetId: string, r: number, c: number, visiting: Set<string>): number | string | boolean | null
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

    getScalar(
      sheetId: string,
      r: number,
      c: number,
      visiting: Set<string>,
    ): number | string | boolean | null {
      const ySheet = sheetsMap.get(sheetId) as Y.Map<unknown> | undefined
      if (!ySheet) return null

      const key = cellKey(r, c)
      const visitKey = `${sheetId}:${key}`
      if (visiting.has(visitKey)) return null

      const state = new SheetState(ySheet as Y.Map<unknown> as Y.Map<Y.Map<unknown>>)
      const data = state.getCellData(r, c)
      if (!data) return null

      if (visiting.has(visitKey)) return null
      const v = data.v
      if (v === null || v === undefined) return null
      return v
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

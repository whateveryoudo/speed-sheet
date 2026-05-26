import * as Y from 'yjs'
import type { Sheet } from '@speed-sheet/core'
import { SheetState } from '@speed-sheet/core'
import { cellKey, parseCellKey, parseDepTargetKey } from './cell-key'
import { createFormulaContext } from './context'
import { evaluateFormulaString } from './evaluate'
import { cellPatchFromFormulaResult } from './result'
import { extractRefTokens, parseRefToken } from './refs'
import { FORMULA_REF_COLORS } from './refSpans'

export interface FormulaRangeHighlight {
  sheetId: string
  row: [number, number]
  column: [number, number]
  color: string
}

const HIGHLIGHT_COLORS = [...FORMULA_REF_COLORS]

export function buildHighlightsFromFormula(
  formula: string,
  ctx: ReturnType<typeof createFormulaContext>,
): FormulaRangeHighlight[] {
  const tokens = extractRefTokens(formula)
  const out: FormulaRangeHighlight[] = []
  tokens.forEach((token, i) => {
    const ref = parseRefToken(token)
    if (!ref) return
    const sheetId = ctx.resolveSheetId(ref.sheet) ?? ctx.activeSheetId
    if (!sheetId) return
    const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]
    if (ref.range) {
      out.push({ sheetId, row: ref.range.row, column: ref.range.column, color })
    } else if (ref.cell) {
      out.push({
        sheetId,
        row: [ref.cell.r, ref.cell.r],
        column: [ref.cell.c, ref.cell.c],
        color,
      })
    }
  })
  return out
}

export function recalculateWorkbook(sheet: Sheet): void {
  const ctx = createFormulaContext(sheet)
  const sheetsMap = sheet.ydoc.getMap('sheets')
  const formulas: Array<{ sheetId: string; r: number; c: number; f: string }> = []

  for (const sheetId of sheet.getSheetIds()) {
    const ySheet = sheetsMap.get(sheetId) as Y.Map<unknown> | undefined
    if (!ySheet) continue
    const state = new SheetState(ySheet as Y.Map<unknown> as Y.Map<Y.Map<unknown>>)
    state.cells.forEach((cell: Y.Map<unknown>, key: string) => {
      const data = cell.toJSON() as { f?: string }
      const pos = parseCellKey(key)
      if (pos && data.f && String(data.f).startsWith('=')) {
        formulas.push({ sheetId, r: pos.r, c: pos.c, f: String(data.f) })
      }
    })
  }

  for (let pass = 0; pass < 8; pass++) {
    let changed = false
    for (const item of formulas) {
      const visiting = new Set<string>()
      const result = evaluateFormulaString(item.f, ctx, visiting)
      const ySheet = sheetsMap.get(item.sheetId) as Y.Map<unknown> | undefined
      if (!ySheet) continue
      const state = new SheetState(ySheet as Y.Map<unknown> as Y.Map<Y.Map<unknown>>)
      const prev = state.getCellData(item.r, item.c)
      const patch = cellPatchFromFormulaResult(item.f, result)
      if (prev?.v !== patch.v || prev?.m !== patch.m || prev?.ef !== patch.ef) {
        changed = true
        sheet.ydoc.transact(() => {
          state.setCell(item.r, item.c, patch)
        })
      }
    }
    if (!changed) break
  }
}

export function updateDependents(
  sheet: Sheet,
  changedSheetId: string,
  r: number,
  c: number,
  dependents: Map<string, Set<string>>,
): void {
  const key = `${changedSheetId}:${cellKey(r, c)}`
  const targets = dependents.get(key)
  if (!targets?.size) return

  const ctx = createFormulaContext(sheet)
  const sheetsMap = sheet.ydoc.getMap('sheets')

  for (const targetKey of targets) {
    const parsed = parseDepTargetKey(targetKey)
    if (!parsed) continue
    const { sheetId, r: rr, c: cc } = parsed
    const ySheet = sheetsMap.get(sheetId) as Y.Map<unknown> | undefined
    if (!ySheet) continue
    const state = new SheetState(ySheet as Y.Map<unknown> as Y.Map<Y.Map<unknown>>)
    const data = state.getCellData(rr, cc)
    if (!data?.f) continue
    const result = evaluateFormulaString(String(data.f), ctx)
    sheet.ydoc.transact(() => {
      state.setCell(rr, cc, cellPatchFromFormulaResult(String(data.f), result))
    })
  }
}

export function registerFormulaDeps(
  sheetId: string,
  r: number,
  c: number,
  formula: string,
  ctx: ReturnType<typeof createFormulaContext>,
  dependents: Map<string, Set<string>>,
): void {
  const targetKey = `${sheetId}:${cellKey(r, c)}`
  for (const dep of dependents.values()) {
    dep.delete(targetKey)
  }
  for (const k of [...dependents.keys()]) {
    const set = dependents.get(k)!
    if (set.has(targetKey)) set.delete(targetKey)
  }

  const tokens = extractRefTokens(formula)
  for (const token of tokens) {
    const ref = parseRefToken(token)
    if (!ref) continue
    const refSheetId = ctx.resolveSheetId(ref.sheet) ?? sheetId
    if (ref.range) {
      for (let ri = ref.range.row[0]; ri <= ref.range.row[1]; ri++) {
        for (let ci = ref.range.column[0]; ci <= ref.range.column[1]; ci++) {
          const depKey = `${refSheetId}:${cellKey(ri, ci)}`
          if (!dependents.has(depKey)) dependents.set(depKey, new Set())
          dependents.get(depKey)!.add(targetKey)
        }
      }
    } else if (ref.cell) {
      const depKey = `${refSheetId}:${cellKey(ref.cell.r, ref.cell.c)}`
      if (!dependents.has(depKey)) dependents.set(depKey, new Set())
      dependents.get(depKey)!.add(targetKey)
    }
  }
}

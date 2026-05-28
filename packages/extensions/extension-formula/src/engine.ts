import * as Y from 'yjs'
import type { Sheet } from '@speed-sheet/core'
import { SheetState, transactSystem } from '@speed-sheet/core'
import { depKey, parseDepKey } from '@speed-sheet/shared'
import { createFormulaContext } from './context'
import { evaluateFormulaString } from './evaluate'
import {
  displayFormulaToInternal,
  extractInternalRefTokens,
  hasInternalRefs,
  parseInternalRefToken,
} from './formula-bindings'
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

function refToHighlight(
  ctx: ReturnType<typeof createFormulaContext>,
  sheetId: string,
  r: number,
  c: number,
  color: string,
): FormulaRangeHighlight {
  return { sheetId, row: [r, r], column: [c, c], color }
}

export function buildHighlightsFromFormula(
  formula: string,
  ctx: ReturnType<typeof createFormulaContext>,
): FormulaRangeHighlight[] {
  const out: FormulaRangeHighlight[] = []

  if (hasInternalRefs(formula)) {
    const tokens = extractInternalRefTokens(formula)
    tokens.forEach((token, i) => {
      const ref = parseInternalRefToken(token)
      if (!ref) return
      const sheetId = ref.sheetId ?? ctx.activeSheetId
      const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]
      if (ref.endRowId != null && ref.endColId != null) {
        const cells = ctx.expandIdRange(
          sheetId,
          ref.rowId,
          ref.colId,
          ref.endRowId,
          ref.endColId,
        )
        if (!cells.length) return
        let rMin = Infinity
        let rMax = -Infinity
        let cMin = Infinity
        let cMax = -Infinity
        for (const { rowId, colId } of cells) {
          const pos = ctx.idsToDisplay(sheetId, rowId, colId)
          if (!pos) continue
          rMin = Math.min(rMin, pos.r)
          rMax = Math.max(rMax, pos.r)
          cMin = Math.min(cMin, pos.c)
          cMax = Math.max(cMax, pos.c)
        }
        if (rMin !== Infinity) {
          out.push({ sheetId, row: [rMin, rMax], column: [cMin, cMax], color })
        }
      } else {
        const pos = ctx.idsToDisplay(sheetId, ref.rowId, ref.colId)
        if (pos) out.push(refToHighlight(ctx, sheetId, pos.r, pos.c, color))
      }
    })
    return out
  }

  const tokens = extractRefTokens(formula)
  tokens.forEach((token, i) => {
    const ref = parseRefToken(token)
    if (!ref) return
    const sheetId = ctx.resolveSheetId(ref.sheet) ?? ctx.activeSheetId
    const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length]
    if (ref.range) {
      out.push({ sheetId, row: ref.range.row, column: ref.range.column, color })
    } else if (ref.cell) {
      out.push(refToHighlight(ctx, sheetId, ref.cell.r, ref.cell.c, color))
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
    for (const { r, c, data } of state.getAllCells()) {
      if (data.f && String(data.f).startsWith('=') && hasInternalRefs(String(data.f))) {
        formulas.push({ sheetId, r, c, f: String(data.f) })
      }
    }
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
        transactSystem(sheet.ydoc, () => {
          state.setCell(item.r, item.c, patch, false)
        })
      }
    }
    if (!changed) break
  }
}

export function normalizeWorkbookFormulas(sheet: Sheet, dependents: Map<string, Set<string>>): void {
  const ctx = createFormulaContext(sheet)
  const sheetsMap = sheet.ydoc.getMap('sheets')

  for (const sheetId of sheet.getSheetIds()) {
    const ySheet = sheetsMap.get(sheetId) as Y.Map<unknown> | undefined
    if (!ySheet) continue
    const state = new SheetState(ySheet as Y.Map<unknown> as Y.Map<Y.Map<unknown>>)

    for (const { r, c, data } of state.getAllCells()) {
      const f = data.f ? String(data.f) : ''
      if (!f.startsWith('=') || hasInternalRefs(f)) continue

      const internal = displayFormulaToInternal(f, ctx, sheetId)
      const ids = state.resolveCellIds(r, c)
      if (!ids) continue

      transactSystem(sheet.ydoc, () => {
        state.setCell(r, c, { f: internal }, false)
      })
      registerFormulaDeps(sheetId, ids.rowId, ids.colId, internal, ctx, dependents)
    }
  }
}

export function updateDependents(
  sheet: Sheet,
  changedSheetId: string,
  r: number,
  c: number,
  dependents: Map<string, Set<string>>,
): void {
  const ySheet = sheet.ydoc.getMap('sheets').get(changedSheetId) as Y.Map<unknown> | undefined
  if (!ySheet) return
  const state = new SheetState(ySheet as Y.Map<unknown> as Y.Map<Y.Map<unknown>>)
  const ids = state.resolveCellIds(r, c)
  if (!ids) return

  const key = depKey(changedSheetId, ids.rowId, ids.colId)
  const targets = dependents.get(key)
  if (!targets?.size) return

  const ctx = createFormulaContext(sheet)
  const sheetsMap = sheet.ydoc.getMap('sheets')

  for (const targetKey of targets) {
    const parsed = parseDepKey(targetKey)
    if (!parsed) continue
    const { sheetId, rowId, colId } = parsed
    const targetSheet = sheetsMap.get(sheetId) as Y.Map<unknown> | undefined
    if (!targetSheet) continue
    const targetState = new SheetState(targetSheet as Y.Map<unknown> as Y.Map<Y.Map<unknown>>)
    const pos = ctx.idsToDisplay(sheetId, rowId, colId)
    if (!pos) continue
    const data = targetState.getCellData(pos.r, pos.c)
    if (!data?.f) continue
    const f = String(data.f)
    if (!hasInternalRefs(f)) continue
    const result = evaluateFormulaString(f, ctx)
    transactSystem(sheet.ydoc, () => {
      targetState.setCell(pos.r, pos.c, cellPatchFromFormulaResult(f, result), false)
    })
  }
}

export function registerFormulaDeps(
  sheetId: string,
  rowId: string,
  colId: string,
  internalFormula: string,
  ctx: ReturnType<typeof createFormulaContext>,
  dependents: Map<string, Set<string>>,
): void {
  const targetKey = depKey(sheetId, rowId, colId)

  for (const dep of dependents.values()) {
    dep.delete(targetKey)
  }
  for (const k of [...dependents.keys()]) {
    const set = dependents.get(k)!
    if (set.has(targetKey)) set.delete(targetKey)
  }

  for (const token of extractInternalRefTokens(internalFormula)) {
    const ref = parseInternalRefToken(token)
    if (!ref) continue
    const refSheetId = ref.sheetId ?? sheetId

    const link = (depRowId: string, depColId: string): void => {
      const depKeyStr = depKey(refSheetId, depRowId, depColId)
      if (!dependents.has(depKeyStr)) dependents.set(depKeyStr, new Set())
      dependents.get(depKeyStr)!.add(targetKey)
    }

    if (ref.endRowId != null && ref.endColId != null) {
      for (const cell of ctx.expandIdRange(
        refSheetId,
        ref.rowId,
        ref.colId,
        ref.endRowId,
        ref.endColId,
      )) {
        link(cell.rowId, cell.colId)
      }
    } else {
      link(ref.rowId, ref.colId)
    }
  }
}

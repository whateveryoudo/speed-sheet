import type { Sheet } from '@speed-sheet/core'
import {
  Extension,
  type CommandContext,
  type ExtensionCommandContext,
} from '@speed-sheet/core'
import { depKey } from '@speed-sheet/shared'
import { createFormulaContext } from './context'
import { evaluateFormulaString, isFormulaInput } from './evaluate'
import {
  buildHighlightsFromFormula,
  normalizeWorkbookFormulas,
  recalculateWorkbook,
  registerFormulaDeps,
  updateDependents,
} from './engine'
import { displayFormulaToInternal } from './formula-bindings'
import { cellPatchFromFormulaResult } from './result'

export interface FormulaStorage {
  evaluating: boolean
  dependents: Map<string, Set<string>>
  sheet: Sheet | null
}

function afterLayoutChange(sheet: Sheet, storage: FormulaStorage): void {
  storage.evaluating = true
  try {
    recalculateWorkbook(sheet)
  } finally {
    storage.evaluating = false
  }
  sheet.notifyLayoutChange()
}

export const FormulaExtension = Extension.create<FormulaStorage>({
  name: 'formula',
  priority: 10,

  addStorage() {
    return {
      evaluating: false,
      dependents: new Map(),
      sheet: null,
    }
  },

  addCommands(ctx: ExtensionCommandContext) {
    const boundSheet = ctx.sheet

    return {
      setCellValue: (props: { r: number; c: number; value: string }) => {
        return ({ state }: CommandContext) => {
          const raw = props.value
          const sheetId = boundSheet.getActiveSheetId()
          const ids = state.resolveCellIds(props.r, props.c)

          if (isFormulaInput(raw)) {
            const fctx = createFormulaContext(boundSheet)
            const internal = displayFormulaToInternal(raw, fctx, sheetId)
            const result = evaluateFormulaString(internal, fctx)
            state.setCell(props.r, props.c, cellPatchFromFormulaResult(internal, result))
            if (ids) {
              registerFormulaDeps(
                sheetId,
                ids.rowId,
                ids.colId,
                internal,
                fctx,
                this.storage.dependents,
              )
            }
          } else {
            const num = Number(raw)
            const v: string | number = !Number.isNaN(num) && raw !== '' ? num : raw
            state.setCell(props.r, props.c, {
              v,
              m: raw,
              ef: undefined,
              em: undefined,
            })
            const cell = state.getCell(props.r, props.c)
            cell?.delete('f')
            if (ids) {
              const tk = depKey(sheetId, ids.rowId, ids.colId)
              for (const set of this.storage.dependents.values()) set.delete(tk)
            }
          }

          return true
        }
      },

      setCellFormula: (props: { r: number; c: number; formula: string }) => {
        return ({ state }: CommandContext) => {
          const display = props.formula.startsWith('=') ? props.formula : `=${props.formula}`
          const fctx = createFormulaContext(boundSheet)
          const sheetId = boundSheet.getActiveSheetId()
          const internal = displayFormulaToInternal(display, fctx, sheetId)
          const result = evaluateFormulaString(internal, fctx)
          const ids = state.resolveCellIds(props.r, props.c)
          state.setCell(props.r, props.c, cellPatchFromFormulaResult(internal, result))
          if (ids) {
            registerFormulaDeps(
              sheetId,
              ids.rowId,
              ids.colId,
              internal,
              fctx,
              this.storage.dependents,
            )
          }
          return true
        }
      },

      recalculateFormulas: () => {
        return () => {
          this.storage.evaluating = true
          try {
            recalculateWorkbook(boundSheet)
          } finally {
            this.storage.evaluating = false
          }
          return true
        }
      },

      insertRows: (props: { at: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          boundSheet.notifyBeforeLayoutChange()
          state.insertRows(props.at, props.count ?? 1)
          afterLayoutChange(boundSheet, this.storage)
          return true
        }
      },
      deleteRows: (props: { at: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          boundSheet.notifyBeforeLayoutChange()
          state.deleteRows(props.at, props.count ?? 1)
          afterLayoutChange(boundSheet, this.storage)
          return true
        }
      },
      insertCols: (props: { at: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          boundSheet.notifyBeforeLayoutChange()
          state.insertCols(props.at, props.count ?? 1)
          afterLayoutChange(boundSheet, this.storage)
          return true
        }
      },
      deleteCols: (props: { at: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          boundSheet.notifyBeforeLayoutChange()
          state.deleteCols(props.at, props.count ?? 1)
          afterLayoutChange(boundSheet, this.storage)
          return true
        }
      },
    }
  },

  onInit(this: Extension<FormulaStorage>, sheet: Sheet) {
    this.storage.sheet = sheet
    this.storage.evaluating = true
    try {
      normalizeWorkbookFormulas(sheet, this.storage.dependents)
      recalculateWorkbook(sheet)
    } finally {
      this.storage.evaluating = false
    }
  },

  onCellChange(this: Extension<FormulaStorage>, r: number, c: number) {
    if (this.storage.evaluating || !this.storage.sheet) return
    updateDependents(
      this.storage.sheet,
      this.storage.sheet.getActiveSheetId(),
      r,
      c,
      this.storage.dependents,
    )
  },
})

export function getFormulaHighlights(sheet: Sheet, formula: string) {
  if (!isFormulaInput(formula)) return []
  const ctx = createFormulaContext(sheet)
  return buildHighlightsFromFormula(formula, ctx)
}

export type { FormulaRangeHighlight } from './engine'

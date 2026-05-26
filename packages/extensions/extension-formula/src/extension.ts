import type { Sheet } from '@speed-sheet/core'
import {
  Extension,
  type CommandContext,
  type ExtensionCommandContext,
} from '@speed-sheet/core'
import { cellKey } from '@speed-sheet/shared'
import { createFormulaContext } from './context'
import { evaluateFormulaString, isFormulaInput } from './evaluate'
import { cellPatchFromFormulaResult } from './result'
import {
  buildHighlightsFromFormula,
  recalculateWorkbook,
  registerFormulaDeps,
  updateDependents,
} from './engine'
export interface FormulaStorage {
  evaluating: boolean
  dependents: Map<string, Set<string>>
  sheet: Sheet | null
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

          if (isFormulaInput(raw)) {
            const fctx = createFormulaContext(boundSheet)
            const result = evaluateFormulaString(raw, fctx)
            state.setCell(props.r, props.c, cellPatchFromFormulaResult(raw, result))
            registerFormulaDeps(sheetId, props.r, props.c, raw, fctx, this.storage.dependents)
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
            const tk = `${sheetId}:${cellKey(props.r, props.c)}`
            for (const set of this.storage.dependents.values()) set.delete(tk)
          }

          return true
        }
      },

      setCellFormula: (props: { r: number; c: number; formula: string }) => {
        return ({ state }: CommandContext) => {
          const f = props.formula.startsWith('=') ? props.formula : `=${props.formula}`
          const fctx = createFormulaContext(boundSheet)
          const result = evaluateFormulaString(f, fctx)
          const sheetId = boundSheet.getActiveSheetId()
          state.setCell(props.r, props.c, cellPatchFromFormulaResult(f, result))
          registerFormulaDeps(sheetId, props.r, props.c, f, fctx, this.storage.dependents)
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
    }
  },

  onInit(this: Extension<FormulaStorage>, sheet: Sheet) {
    this.storage.sheet = sheet
    this.storage.evaluating = true
    try {
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

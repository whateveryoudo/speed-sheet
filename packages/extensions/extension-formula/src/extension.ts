import {
  Extension,
  transactUser,
  formatCellValue,
  fill1DSequence,
  shiftFormulaReferences,
  type CommandContext,
  type ExtensionCommandContext,
  type CellRange,
  type AutofillDirection,
  type AutofillMode,
  type Sheet,
} from '@speed-sheet/core'
import type { CellAttributes, CellStyle } from '@speed-sheet/shared'
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
import { displayFormulaToInternal, internalFormulaToDisplay } from './formula-bindings'
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

      autofill: (props: {
        sourceRange: CellRange
        targetRange: CellRange
        direction: AutofillDirection
        mode?: AutofillMode
      }) => {
        return ({ state }: CommandContext) => {
          const { sourceRange, targetRange, direction, mode = 'sequence' } = props
          const sheetId = boundSheet.getActiveSheetId()
          const fctx = createFormulaContext(boundSheet)

          const sr0 = Math.min(sourceRange.r0, sourceRange.r1)
          const sr1 = Math.max(sourceRange.r0, sourceRange.r1)
          const sc0 = Math.min(sourceRange.c0, sourceRange.c1)
          const sc1 = Math.max(sourceRange.c0, sourceRange.c1)

          const tr0 = Math.min(targetRange.r0, targetRange.r1)
          const tr1 = Math.max(targetRange.r0, targetRange.r1)
          const tc0 = Math.min(targetRange.c0, targetRange.c1)
          const tc1 = Math.max(targetRange.c0, targetRange.c1)

          const doc = state.root.doc
          const STYLE_KEYS: Array<keyof CellStyle> = [
            'fc', 'bg', 'bl', 'ff', 'fs', 'it', 'cl', 'un', 'vt', 'ht', 'tr', 'tb'
          ]

          const run = () => {
            const writeCell = (targetR: number, targetC: number, filledCell: CellAttributes) => {
              const targetExisting = state.getCellData(targetR, targetC)
              const ids = state.resolveCellIds(targetR, targetC)

              if (mode === 'formatOnly') {
                const newCell: CellAttributes = {
                  ...(targetExisting ?? { v: null }),
                  ct: filledCell.ct,
                }
                for (const k of STYLE_KEYS) {
                  if (filledCell[k] !== undefined) {
                    (newCell as any)[k] = filledCell[k]
                  } else {
                    delete (newCell as any)[k]
                  }
                }
                if (newCell.ct && newCell.v != null) {
                  newCell.m = formatCellValue(newCell.v, newCell.ct).m
                }
                state.setCell(targetR, targetC, newCell)
                return
              }

              if (mode === 'noFormat') {
                if (filledCell.f && typeof filledCell.f === 'string') {
                  const targetInternal = filledCell.f
                  const evalResult = evaluateFormulaString(targetInternal, fctx)
                  const patch = cellPatchFromFormulaResult(targetInternal, evalResult)
                  state.setCell(targetR, targetC, {
                    ...(targetExisting ?? {}),
                    ...patch,
                    ct: targetExisting?.ct,
                  })
                  if (ids) {
                    registerFormulaDeps(
                      sheetId,
                      ids.rowId,
                      ids.colId,
                      targetInternal,
                      fctx,
                      this.storage.dependents,
                    )
                  }
                  return
                }

                const finalFormat = targetExisting?.ct
                let finalM = filledCell.m
                if (finalFormat && filledCell.v != null) {
                  finalM = formatCellValue(filledCell.v, finalFormat).m
                } else if (filledCell.v != null) {
                  finalM = String(filledCell.v)
                }
                const newCell: CellAttributes = {
                  ...(targetExisting ?? {}),
                  v: filledCell.v,
                  m: finalM,
                }
                delete (newCell as any).f
                delete (newCell as any).ef
                delete (newCell as any).em
                state.setCell(targetR, targetC, newCell)
                const rawCell = state.getCell(targetR, targetC)
                rawCell?.delete('f')
                rawCell?.delete('ef')
                rawCell?.delete('em')
                if (ids) {
                  const tk = depKey(sheetId, ids.rowId, ids.colId)
                  for (const set of this.storage.dependents.values()) set.delete(tk)
                }
                return
              }

              // 检查 filledCell 是否包含公式
              if (filledCell.f && typeof filledCell.f === 'string') {
                const targetInternal = filledCell.f
                const evalResult = evaluateFormulaString(targetInternal, fctx)
                const patch = cellPatchFromFormulaResult(targetInternal, evalResult)
                state.setCell(targetR, targetC, {
                  ...(targetExisting ?? {}),
                  ...filledCell,
                  ...patch,
                })
                if (ids) {
                  registerFormulaDeps(
                    sheetId,
                    ids.rowId,
                    ids.colId,
                    targetInternal,
                    fctx,
                    this.storage.dependents,
                  )
                }
                return
              }

              // 非公式单元格：保留目标单元格已有格式（如有）
              const hasTargetFormat =
                targetExisting?.ct &&
                targetExisting.ct.fa &&
                targetExisting.ct.fa !== 'General'

              const finalFormat = hasTargetFormat
                ? targetExisting.ct
                : filledCell.ct

              let finalM = filledCell.m
              if (finalFormat && filledCell.v != null) {
                finalM = formatCellValue(filledCell.v, finalFormat).m
              } else if (filledCell.v != null) {
                finalM = String(filledCell.v)
              }

              const newCell: CellAttributes = {
                ...(targetExisting ?? {}),
                ...(hasTargetFormat ? {} : filledCell),
                v: filledCell.v,
                m: finalM,
                ct: finalFormat,
              }
              delete (newCell as any).f
              delete (newCell as any).ef
              delete (newCell as any).em
              state.setCell(targetR, targetC, newCell)
              const rawCell = state.getCell(targetR, targetC)
              rawCell?.delete('f')
              rawCell?.delete('ef')
              rawCell?.delete('em')
              if (ids) {
                const tk = depKey(sheetId, ids.rowId, ids.colId)
                for (const set of this.storage.dependents.values()) set.delete(tk)
              }
            }

            if (direction === 'down' || direction === 'up') {
              for (let c = sc0; c <= sc1; c++) {
                const sourceCol: Array<CellAttributes | null> = []
                for (let r = sr0; r <= sr1; r++) {
                  sourceCol.push(state.getCellData(r, c))
                }
                const targetCount = tr1 - tr0 + 1

                const hasFormula = sourceCol.some((cell) => cell?.f != null && cell.f !== '')

                if (hasFormula && mode !== 'formatOnly') {
                  const sourceLen = sourceCol.length
                  for (let i = 0; i < targetCount; i++) {
                    const targetR = direction === 'down' ? tr0 + i : tr1 - i
                    const srcIdx = direction === 'down'
                      ? i % sourceLen
                      : (sourceLen - 1 - (i % sourceLen) + sourceLen) % sourceLen
                    const srcR = sr0 + srcIdx
                    const srcCell = sourceCol[srcIdx]

                    if (srcCell?.f) {
                      if (mode === 'copy') {
                        writeCell(targetR, c, { ...srcCell })
                      } else {
                        const a1Formula = internalFormulaToDisplay(srcCell.f, fctx, sheetId)
                        const deltaR = targetR - srcR
                        const deltaC = 0
                        const shiftedA1 = shiftFormulaReferences(a1Formula, deltaR, deltaC)
                        const targetInternal = displayFormulaToInternal(shiftedA1, fctx, sheetId)
                        writeCell(targetR, c, { ...srcCell, f: targetInternal, v: null, m: '' })
                      }
                    } else {
                      const [filledItem] = fill1DSequence([srcCell], 1, {
                        direction: direction === 'down' ? 'forward' : 'backward',
                        axis: 'row',
                        mode,
                      })
                      writeCell(targetR, c, filledItem ?? { v: '' })
                    }
                  }
                } else {
                  const filled = fill1DSequence(sourceCol, targetCount, {
                    direction: direction === 'down' ? 'forward' : 'backward',
                    axis: 'row',
                    mode,
                  })
                  for (let i = 0; i < targetCount; i++) {
                    const targetR = direction === 'down' ? tr0 + i : tr1 - i
                    writeCell(targetR, c, filled[i])
                  }
                }
              }
            } else {
              for (let r = sr0; r <= sr1; r++) {
                const sourceRow: Array<CellAttributes | null> = []
                for (let c = sc0; c <= sc1; c++) {
                  sourceRow.push(state.getCellData(r, c))
                }
                const targetCount = tc1 - tc0 + 1

                const hasFormula = sourceRow.some((cell) => cell?.f != null && cell.f !== '')

                if (hasFormula && mode !== 'formatOnly') {
                  const sourceLen = sourceRow.length
                  for (let i = 0; i < targetCount; i++) {
                    const targetC = direction === 'right' ? tc0 + i : tc1 - i
                    const srcIdx = direction === 'right'
                      ? i % sourceLen
                      : (sourceLen - 1 - (i % sourceLen) + sourceLen) % sourceLen
                    const srcC = sc0 + srcIdx
                    const srcCell = sourceRow[srcIdx]

                    if (srcCell?.f) {
                      if (mode === 'copy') {
                        writeCell(r, targetC, { ...srcCell })
                      } else {
                        const a1Formula = internalFormulaToDisplay(srcCell.f, fctx, sheetId)
                        const deltaR = 0
                        const deltaC = targetC - srcC
                        const shiftedA1 = shiftFormulaReferences(a1Formula, deltaR, deltaC)
                        const targetInternal = displayFormulaToInternal(shiftedA1, fctx, sheetId)
                        writeCell(r, targetC, { ...srcCell, f: targetInternal, v: null, m: '' })
                      }
                    } else {
                      const [filledItem] = fill1DSequence([srcCell], 1, {
                        direction: direction === 'right' ? 'forward' : 'backward',
                        axis: 'col',
                        mode,
                      })
                      writeCell(r, targetC, filledItem ?? { v: '' })
                    }
                  }
                } else {
                  const filled = fill1DSequence(sourceRow, targetCount, {
                    direction: direction === 'right' ? 'forward' : 'backward',
                    axis: 'col',
                    mode,
                  })
                  for (let i = 0; i < targetCount; i++) {
                    const targetC = direction === 'right' ? tc0 + i : tc1 - i
                    writeCell(r, targetC, filled[i])
                  }
                }
              }
            }

            const fullR0 = Math.min(sr0, tr0)
            const fullR1 = Math.max(sr1, tr1)
            const fullC0 = Math.min(sc0, tc0)
            const fullC1 = Math.max(sc1, tc1)
            state.setSelection({
              row: [fullR0, fullR1],
              column: [fullC0, fullC1],
              anchor: { r: sr0, c: sc0 },
            })
          }

          if (doc) {
            transactUser(doc, run)
          } else {
            run()
          }

          this.storage.evaluating = true
          try {
            recalculateWorkbook(boundSheet)
          } finally {
            this.storage.evaluating = false
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

import { Extension } from '../Extension'
import type { CommandContext } from '../types'
import { transactUser } from '../../yjs/transact'
import type { CellAttributes, CellFormat } from '@speed-sheet/shared'
import { formatCellValue, adjustFormatDecimalPlaces } from '../../format/number-format'
import { fill1DSequence, type CellRange, type AutofillDirection } from '../../autofill/autofill-logic'

export const CellEditingExtension = Extension.create({
  name: 'cellEditing',
  priority: -50,

  addCommands() {
    return {
      setCellValue: (props: { r: number; c: number; value: string }) => {
        return ({ state }: CommandContext) => {
          const num = Number(props.value)
          const v: string | number = !isNaN(num) && props.value !== '' ? num : props.value
          const cell = state.getCellData(props.r, props.c)
          let m = props.value
          if (cell?.ct && cell.ct.fa !== 'General') {
            const formatted = formatCellValue(v, cell.ct)
            m = formatted.m
          }
          state.setCell(props.r, props.c, { v, m })
          return true
        }
      },

      setCellFormat: (props: { r: number; c: number; format: CellFormat }) => {
        return ({ state }: CommandContext) => {
          const cell = state.getCellData(props.r, props.c)
          const v = cell?.v ?? ''
          const { m } = formatCellValue(v, props.format)
          state.setCell(props.r, props.c, {
            ct: props.format,
            m,
          } as any)
          return true
        }
      },

      changeDecimalPlaces: (props: { r: number; c: number; delta: 1 | -1 }) => {
        return ({ state }: CommandContext) => {
          const cell = state.getCellData(props.r, props.c)
          const v = cell?.v ?? ''
          const nextFormat = adjustFormatDecimalPlaces(cell?.ct, v, props.delta)
          const { m } = formatCellValue(v, nextFormat)
          state.setCell(props.r, props.c, {
            ct: nextFormat,
            m,
          } as any)
          return true
        }
      },

      setBold: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          const cell = state.getCellData(props.r, props.c)
          const current = cell?.bl ?? 0
          state.setCell(props.r, props.c, { bl: current ? 0 : 1 } as any)
          return true
        }
      },

      setItalic: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          const cell = state.getCellData(props.r, props.c)
          const current = cell?.it ?? 0
          state.setCell(props.r, props.c, { it: current ? 0 : 1 } as any)
          return true
        }
      },

      setStrikethrough: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          const cell = state.getCellData(props.r, props.c)
          const current = cell?.cl ?? 0
          state.setCell(props.r, props.c, { cl: current ? 0 : 1 } as any)
          return true
        }
      },

      setFontColor: (props: { r: number; c: number; color: string }) => {
        return ({ state }: CommandContext) => {
          state.setCell(props.r, props.c, { fc: props.color } as any)
          return true
        }
      },

      setBgColor: (props: { r: number; c: number; color: string }) => {
        return ({ state }: CommandContext) => {
          state.setCell(props.r, props.c, { bg: props.color } as any)
          return true
        }
      },

      setFontSize: (props: { r: number; c: number; size: number }) => {
        return ({ state }: CommandContext) => {
          state.setCell(props.r, props.c, { fs: props.size } as any)
          return true
        }
      },

      setUnderline: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          const cell = state.getCellData(props.r, props.c)
          const current = cell?.un ?? 0
          state.setCell(props.r, props.c, { un: current ? 0 : 1 } as any)
          return true
        }
      },

      setTextAlign: (props: { r: number; c: number; align: 0 | 1 | 2 }) => {
        return ({ state }: CommandContext) => {
          state.setCell(props.r, props.c, { ht: props.align } as any)
          return true
        }
      },

      clearCellFormat: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          const cell = state.getCellData(props.r, props.c)
          if (!cell) return true
          const { v, m, f, ct, qp } = cell
          state.setCell(props.r, props.c, { v, m, f, ct, qp } as any)
          return true
        }
      },

      applyCellStyle: (props: { r: number; c: number; style: Record<string, unknown> }) => {
        return ({ state }: CommandContext) => {
          state.setCell(props.r, props.c, props.style as any)
          return true
        }
      },

      clearCell: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          state.deleteCell(props.r, props.c)
          return true
        }
      },

      clearSelection: () => {
        return ({ state }: CommandContext) => {
          const sel = state.getSelection()
          const r0 = Math.min(sel.row[0], sel.row[1])
          const r1 = Math.max(sel.row[0], sel.row[1])
          const c0 = Math.min(sel.column[0], sel.column[1])
          const c1 = Math.max(sel.column[0], sel.column[1])
          if (state.root.doc) {
            transactUser(state.root.doc, () => {
              for (let r = r0; r <= r1; r++) {
                for (let c = c0; c <= c1; c++) {
                  state.deleteCell(r, c)
                }
              }
            })
          }
          return true
        }
      },

      autofill: (props: { sourceRange: CellRange; targetRange: CellRange; direction: AutofillDirection }) => {
        return ({ state }: CommandContext) => {
          const { sourceRange, targetRange, direction } = props
          const sr0 = Math.min(sourceRange.r0, sourceRange.r1)
          const sr1 = Math.max(sourceRange.r0, sourceRange.r1)
          const sc0 = Math.min(sourceRange.c0, sourceRange.c1)
          const sc1 = Math.max(sourceRange.c0, sourceRange.c1)

          const tr0 = Math.min(targetRange.r0, targetRange.r1)
          const tr1 = Math.max(targetRange.r0, targetRange.r1)
          const tc0 = Math.min(targetRange.c0, targetRange.c1)
          const tc1 = Math.max(targetRange.c0, targetRange.c1)

          const doc = state.root.doc
          const run = () => {
            const writeCell = (targetR: number, targetC: number, filledCell: CellAttributes) => {
              const targetExisting = state.getCellData(targetR, targetC)
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
                f: filledCell.f,
                m: finalM,
                ct: finalFormat,
              }
              state.setCell(targetR, targetC, newCell)
            }

            if (direction === 'down' || direction === 'up') {
              for (let c = sc0; c <= sc1; c++) {
                const sourceCol: Array<CellAttributes | null> = []
                for (let r = sr0; r <= sr1; r++) {
                  sourceCol.push(state.getCellData(r, c))
                }
                const targetCount = tr1 - tr0 + 1
                const filled = fill1DSequence(sourceCol, targetCount, {
                  direction: direction === 'down' ? 'forward' : 'backward',
                  axis: 'row',
                })
                for (let i = 0; i < targetCount; i++) {
                  const targetR = direction === 'down' ? tr0 + i : tr1 - i
                  writeCell(targetR, c, filled[i])
                }
              }
            } else {
              for (let r = sr0; r <= sr1; r++) {
                const sourceRow: Array<CellAttributes | null> = []
                for (let c = sc0; c <= sc1; c++) {
                  sourceRow.push(state.getCellData(r, c))
                }
                const targetCount = tc1 - tc0 + 1
                const filled = fill1DSequence(sourceRow, targetCount, {
                  direction: direction === 'right' ? 'forward' : 'backward',
                  axis: 'col',
                })
                for (let i = 0; i < targetCount; i++) {
                  const targetC = direction === 'right' ? tc0 + i : tc1 - i
                  writeCell(r, targetC, filled[i])
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

          return true
        }
      },
    }
  },
})

import { Extension } from '../Extension'
import type { CommandContext } from '../types'
import { transactUser } from '../../yjs/transact'

export const CellEditingExtension = Extension.create({
  name: 'cellEditing',
  priority: -50,

  addCommands() {
    return {
      setCellValue: (props: { r: number; c: number; value: string }) => {
        return ({ state }: CommandContext) => {
          const num = Number(props.value)
          const v: string | number = !isNaN(num) && props.value !== '' ? num : props.value
          state.setCell(props.r, props.c, { v, m: props.value })
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
    }
  },
})

import { Extension } from '../Extension'
import type { CommandContext } from '../types'

export const MergeExtension = Extension.create({
  name: 'merge',
  priority: -95,

  addCommands() {
    return {
      mergeCells: (props?: {
        row?: [number, number]
        column?: [number, number]
      }) => {
        return ({ state }: CommandContext) => {
          const sel = state.getSelection()
          const row = props?.row ?? sel.row
          const col = props?.column ?? sel.column
          const r0 = Math.min(row[0], row[1])
          const r1 = Math.max(row[0], row[1])
          const c0 = Math.min(col[0], col[1])
          const c1 = Math.max(col[0], col[1])
          state.mergeCells(row[0], col[0], row[1], col[1])
          state.setSelection({
            row: [r0, r1],
            column: [c0, c1],
            anchor: { r: r0, c: c0 },
          })
          return true
        }
      },

      unmergeCells: (props?: {
        row?: [number, number]
        column?: [number, number]
      }) => {
        return ({ state }: CommandContext) => {
          const sel = state.getSelection()
          const row = props?.row ?? sel.row
          const col = props?.column ?? sel.column
          const mc = state.createMergeContext()
          const m = mc.mergeAtFocus(sel)
          if (m) {
            state.unmergeCells(m.r, m.c, m.r + m.rs - 1, m.c + m.cs - 1)
            state.setSelection({
              row: [m.r, m.r + m.rs - 1],
              column: [m.c, m.c + m.cs - 1],
              anchor: { r: m.r, c: m.c },
            })
          } else {
            const r0 = Math.min(row[0], row[1])
            const r1 = Math.max(row[0], row[1])
            const c0 = Math.min(col[0], col[1])
            const c1 = Math.max(col[0], col[1])
            state.unmergeCells(r0, c0, r1, c1)
          }
          return true
        }
      },
    }
  },
})

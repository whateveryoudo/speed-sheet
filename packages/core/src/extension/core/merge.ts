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
          state.mergeCells(row[0], col[0], row[1], col[1])
          return true
        }
      },
    }
  },
})

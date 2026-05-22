import { Extension } from '../Extension'
import type { CommandContext } from '../types'

export const SelectionExtension = Extension.create({
  name: 'selection',
  priority: -99,

  addStorage() {
    return {
      current: { row: [0, 0] as [number, number], column: [0, 0] as [number, number] },
      range: [] as { row: [number, number]; column: [number, number] }[],
    }
  },

  addCommands() {
    return {
      selectCell: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          state.setSelection({ row: [props.r, props.r], column: [props.c, props.c] })
          return true
        }
      },
      selectRange: (props: { row: [number, number]; column: [number, number] }) => {
        return ({ state }: CommandContext) => {
          state.setSelection(props)
          return true
        }
      },
    }
  },
})

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
          state.setSelection({
            row: [props.r, props.r],
            column: [props.c, props.c],
            anchor: { r: props.r, c: props.c },
          })
          return true
        }
      },
      selectRange: (props: {
        row: [number, number]
        column: [number, number]
        anchor?: { r: number; c: number }
      }) => {
        return ({ state }: CommandContext) => {
          const r0 = Math.min(props.row[0], props.row[1])
          const r1 = Math.max(props.row[0], props.row[1])
          const c0 = Math.min(props.column[0], props.column[1])
          const c1 = Math.max(props.column[0], props.column[1])
          const anchor = props.anchor ?? { r: props.row[0], c: props.column[0] }
          state.setSelection({
            row: [r0, r1],
            column: [c0, c1],
            anchor,
          })
          return true
        }
      },
    }
  },
})

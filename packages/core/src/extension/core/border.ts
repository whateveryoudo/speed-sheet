import { Extension } from '../Extension'
import type { CommandContext } from '../types'

export type BorderType =
  | 'all'
  | 'outside'
  | 'thick-outside'
  | 'inside'
  | 'horizontal'
  | 'vertical'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'none'

export interface SetBorderOptions {
  row?: [number, number]
  column?: [number, number]
  borderType: BorderType
  color?: string
  style?: number
}

export const BorderExtension = Extension.create({
  name: 'border',
  priority: -94,

  addCommands() {
    return {
      setBorder: (options: SetBorderOptions) => {
        return ({ state }: CommandContext) => {
          const sel = state.getSelection()
          const row = options.row ?? sel.row
          const column = options.column ?? sel.column
          state.applyBorderRange({
            row,
            column,
            borderType: options.borderType,
            color: options.color,
            style: options.style,
          })
          return true
        }
      },
      clearBorder: (options?: { row?: [number, number]; column?: [number, number] }) => {
        return ({ state }: CommandContext) => {
          const sel = state.getSelection()
          const row = options?.row ?? sel.row
          const column = options?.column ?? sel.column
          state.applyBorderRange({
            row,
            column,
            borderType: 'none',
          })
          return true
        }
      },
    }
  },
})

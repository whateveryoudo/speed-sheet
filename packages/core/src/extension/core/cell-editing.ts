import { Extension } from '../Extension'
import type { CommandContext } from '../types'

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

      clearCell: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          state.deleteCell(props.r, props.c)
          return true
        }
      },
    }
  },
})

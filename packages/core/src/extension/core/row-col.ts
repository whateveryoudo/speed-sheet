import { Extension } from '../Extension'
import type { CommandContext } from '../types'

export const RowColExtension = Extension.create({
  name: 'rowCol',
  priority: -96,

  addCommands() {
    return {
      insertRows: (props: { at: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          state.insertRows(props.at, props.count ?? 1)
          return true
        }
      },
      deleteRows: (props: { at: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          state.deleteRows(props.at, props.count ?? 1)
          return true
        }
      },
      insertCols: (props: { at: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          state.insertCols(props.at, props.count ?? 1)
          return true
        }
      },
      deleteCols: (props: { at: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          state.deleteCols(props.at, props.count ?? 1)
          return true
        }
      },
    }
  },
})

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

      setRowHeight: (props: { row: number; height: number; rows?: number[] }) => {
        return ({ state }: CommandContext) => {
          const targets = props.rows?.length ? props.rows : [props.row]
          state.setRowHeights(targets, props.height)
          return true
        }
      },

      setColWidth: (props: { col: number; width: number; cols?: number[] }) => {
        return ({ state }: CommandContext) => {
          const targets = props.cols?.length ? props.cols : [props.col]
          state.setColWidths(targets, props.width)
          return true
        }
      },

      moveRows: (props: { from: number; insertBefore: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          state.moveRows(props.from, props.insertBefore, props.count ?? 1)
          return true
        }
      },

      moveCols: (props: { from: number; insertBefore: number; count?: number }) => {
        return ({ state }: CommandContext) => {
          state.moveCols(props.from, props.insertBefore, props.count ?? 1)
          return true
        }
      },
    }
  },
})

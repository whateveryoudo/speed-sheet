import type { FreezeState } from '@speed-sheet/shared'
import { Extension } from '../Extension'
import type { CommandContext } from '../types'

export const FreezeExtension = Extension.create({
  name: 'freeze',
  priority: -95,

  addCommands() {
    return {
      setFreeze: (props: FreezeState) => {
        return ({ state }: CommandContext) => {
          const xSplit = Math.max(0, Math.floor(props.xSplit ?? 0))
          const ySplit = Math.max(0, Math.floor(props.ySplit ?? 0))
          if (xSplit <= 0 && ySplit <= 0) {
            state.clearFreeze()
          } else {
            state.setFreeze({ xSplit, ySplit })
          }
          return true
        }
      },

      clearFreeze: () => {
        return ({ state }: CommandContext) => {
          state.clearFreeze()
          return true
        }
      },
    }
  },
})

import { Extension } from '../Extension'
import type { CommandContext } from '../types'

export const ClipboardExtension = Extension.create({
  name: 'clipboard',
  priority: -97,

  addStorage() {
    return {
      copied: null as any,
      isCut: false,
    }
  },

  addCommands() {
    return {
      copy: () => {
        return (_ctx: CommandContext) => {
          return true
        }
      },
      paste: () => {
        return (_ctx: CommandContext) => {
          return true
        }
      },
      cut: () => {
        return (_ctx: CommandContext) => {
          return true
        }
      },
    }
  },
})

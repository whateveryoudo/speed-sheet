import type { Sheet } from '../Sheet'

/** Command: props → bool | (ctx) => bool | Promise */
export type CommandFn = (
  props?: any,
) => boolean | Promise<boolean> | ((ctx: CommandContext) => boolean | Promise<boolean>)

export interface CommandContext {
  ydoc: ReturnType<Sheet['getYDoc']>
  state: Sheet['state']
  chain: () => CommandChain
}

export interface CommandChain {
  run(): void
  can(): boolean
  [key: string]: any
}

export type KeyboardShortcutHandler = () => boolean

export interface ExtensionCommandContext {
  sheet: Sheet
}

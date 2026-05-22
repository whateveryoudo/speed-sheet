import type { Extension, CommandFn, CommandContext, CommandChain } from '../extension'
import type { Sheet } from '../Sheet'

/**
 * TipTap-style chainable command manager.
 *
 * Usage:
 *   sheet.chain().selectCell({ r: 0, c: 0 }).run()
 *   sheet.can().deleteRows()
 */
export class CommandManager {
  private sheet: Sheet
  private _commands: Map<string, CommandFn> = new Map()

  constructor(sheet: Sheet) {
    this.sheet = sheet
  }

  registerExtension(ext: Extension): void {
    const commands = ext.getCommands(this.sheet)
    for (const [name, fn] of Object.entries(commands)) {
      if (this._commands.has(name)) {
        console.warn(`[@speed-sheet/core] Command "${name}" overridden by extension "${ext.name}"`)
      }
      this._commands.set(name, fn)
    }
  }

  unregisterExtension(ext: Extension): void {
    const commands = ext.getCommands(this.sheet)
    for (const name of Object.keys(commands)) {
      this._commands.delete(name)
    }
  }

  get(name: string): CommandFn | undefined {
    return this._commands.get(name)
  }

  has(name: string): boolean {
    return this._commands.has(name)
  }

  chain(): CommandChain {
    return new ChainBuilder(this.sheet, this._commands) as unknown as CommandChain
  }

  can(): CommandChain {
    return new ChainBuilder(this.sheet, this._commands, true) as unknown as CommandChain
  }
}

class ChainBuilder {
  private _sheet: Sheet
  private _commands: Map<string, CommandFn>
  private _queued: Array<{ name: string; props: any }> = []
  private _isDryRun: boolean

  constructor(sheet: Sheet, commands: Map<string, CommandFn>, isDryRun = false) {
    this._sheet = sheet
    this._commands = commands
    this._isDryRun = isDryRun

    // Proxy so that any property access like .selectCell({r, c}) queues the command
    const self = this
    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop === 'run' || prop === 'can') {
          return Reflect.get(target, prop, receiver).bind(target)
        }
        if (typeof prop === 'string') {
          return (props?: any) => {
            target._queued.push({ name: prop, props })
            return receiver
          }
        }
        return Reflect.get(target, prop, receiver)
      },
    })
  }

  run(): void {
    if (this._isDryRun) return
    void this._runQueued()
  }

  private async _runQueued(): Promise<void> {
    const ydoc = this._sheet.getYDoc()
    const state = this._sheet.state
    const ctx: CommandContext = {
      ydoc,
      state,
      chain: () => this._sheet.chain(),
    }

    for (const { name, props } of this._queued) {
      const fn = this._commands.get(name)
      if (!fn) {
        console.warn(`[@speed-sheet/core] Unknown command: "${name}"`)
        continue
      }
      try {
        let result = fn.call(null, props)
        if (typeof result === 'function') {
          result = result(ctx)
        }
        if (result instanceof Promise) {
          await result
        }
      } catch (e) {
        console.error(`[@speed-sheet/core] Command "${name}" failed:`, e)
      }
    }

    this._sheet.notifyUpdate()
  }

  can(): boolean {
    return this._queued.every(({ name }) => this._commands.has(name))
  }
}

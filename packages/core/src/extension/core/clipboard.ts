import { Extension } from '../Extension'
import type { CommandContext } from '../types'
import type { CellAttributes, Selection } from '@speed-sheet/shared'
import { transactUser } from '../../yjs/transact'

export interface ClipboardPayload {
  row: [number, number]
  column: [number, number]
  cells: Array<{ dr: number; dc: number; data: CellAttributes }>
}

function normalizeSelection(sel: Selection): {
  r0: number
  r1: number
  c0: number
  c1: number
} {
  return {
    r0: Math.min(sel.row[0], sel.row[1]),
    r1: Math.max(sel.row[0], sel.row[1]),
    c0: Math.min(sel.column[0], sel.column[1]),
    c1: Math.max(sel.column[0], sel.column[1]),
  }
}

function cloneCell(data: CellAttributes): CellAttributes {
  return JSON.parse(JSON.stringify(data)) as CellAttributes
}

function readRange(state: CommandContext['state'], sel: Selection): ClipboardPayload {
  const { r0, r1, c0, c1 } = normalizeSelection(sel)
  const cells: ClipboardPayload['cells'] = []
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const data = state.getCellData(r, c)
      if (data) {
        cells.push({ dr: r - r0, dc: c - c0, data: cloneCell(data) })
      }
    }
  }
  return { row: [r0, r1], column: [c0, c1], cells }
}

export const ClipboardExtension = Extension.create({
  name: 'clipboard',
  priority: -97,

  addStorage() {
    return {
      copied: null as ClipboardPayload | null,
      isCut: false,
    }
  },

  addCommands() {
    return {
      copy: () => {
        return ({ state }: CommandContext) => {
          const payload = readRange(state, state.getSelection())
          this.storage.copied = payload
          this.storage.isCut = false
          return true
        }
      },
      cut: () => {
        return ({ state }: CommandContext) => {
          const sel = state.getSelection()
          const payload = readRange(state, sel)
          this.storage.copied = payload
          this.storage.isCut = true

          const { r0, r1, c0, c1 } = normalizeSelection(sel)
          if (state.root.doc) {
            transactUser(state.root.doc, () => {
              for (let r = r0; r <= r1; r++) {
                for (let c = c0; c <= c1; c++) {
                  state.deleteCell(r, c)
                }
              }
            })
          }
          return true
        }
      },
      paste: () => {
        return ({ state }: CommandContext) => {
          const clip = this.storage.copied
          if (!clip) return false

          const anchor = normalizeSelection(state.getSelection())
          const ar = anchor.r0
          const ac = anchor.c0

          if (state.root.doc) {
            transactUser(state.root.doc, () => {
              for (const { dr, dc, data } of clip.cells) {
                state.setCell(ar + dr, ac + dc, cloneCell(data))
              }
            })
          }

          if (this.storage.isCut) {
            this.storage.isCut = false
            this.storage.copied = null
          }
          return true
        }
      },
    }
  },
})

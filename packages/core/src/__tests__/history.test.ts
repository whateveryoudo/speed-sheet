import { describe, it, expect } from 'vitest'
import { Sheet } from '../Sheet'
import type { WorkbookSnapshot } from '@speed-sheet/shared'

describe('HistoryExtension (Yjs UndoManager)', () => {
  it('undoes and redoes a cell edit', () => {
    const sheet = new Sheet()
    sheet.state.setCell(0, 0, { v: 1, m: '1' })
    expect(sheet.state.getCellData(0, 0)?.v).toBe(1)
    expect(sheet.canUndo()).toBe(true)

    sheet.chain().undo().run()
    expect(sheet.state.getCellData(0, 0)).toBeNull()
    expect(sheet.canRedo()).toBe(true)

    sheet.chain().redo().run()
    expect(sheet.state.getCellData(0, 0)?.v).toBe(1)
  })

  it('undoes insert row as one step', () => {
    const sheet = new Sheet()
    const before = sheet.state.getRowCount()
    sheet.chain().insertRows({ at: 1, count: 1 }).run()
    expect(sheet.state.getRowCount()).toBe(before + 1)

    sheet.chain().undo().run()
    expect(sheet.state.getRowCount()).toBe(before)
  })

  it('does not track initial snapshot load', () => {
    const snapshot: WorkbookSnapshot = {
      version: 2,
      activeSheetId: '0',
      sheets: [
        {
          id: '0',
          name: 'S',
          rowOrder: ['r_a'],
          colOrder: ['c_a'],
          cells: { 'r_a:c_a': { v: 9, m: '9' } },
        },
      ],
    }
    const sheet = new Sheet({ snapshot })
    expect(sheet.state.getCellData(0, 0)?.v).toBe(9)
    expect(sheet.canUndo()).toBe(false)
  })
})

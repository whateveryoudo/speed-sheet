import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { cellIdKey } from '@speed-sheet/shared'
import { SheetState } from '../state/SheetState'
import { initLayoutFromRcEntries } from '../state/sheet-layout'

describe('Sheet layout v2 (stable ids)', () => {
  it('insertRows keeps cell storage keys stable', () => {
    const ydoc = new Y.Doc()
    const ySheet = new Y.Map<unknown>()
    ydoc.getMap('sheets').set('0', ySheet)
    const cell = new Y.Map<unknown>()
    cell.set('v', 42)
    initLayoutFromRcEntries(ySheet, [{ r: 5, c: 2, cell }])

    const state = new SheetState(ySheet)
    const before = state.resolveCellIds(5, 2)!
    const keyBefore = cellIdKey(before.rowId, before.colId)

    state.insertRows(2, 1)

    const after = state.resolveCellIds(6, 2)!
    expect(after.rowId).toBe(before.rowId)
    expect(after.colId).toBe(before.colId)
    expect(state.getCellData(6, 2)?.v).toBe(42)
    expect((ySheet.get('cells') as Y.Map<unknown>).has(keyBefore)).toBe(true)
  })

  it('insertCols keeps cell storage keys stable', () => {
    const ydoc = new Y.Doc()
    const ySheet = new Y.Map<unknown>()
    ydoc.getMap('sheets').set('0', ySheet)
    const cell = new Y.Map<unknown>()
    cell.set('v', 99)
    initLayoutFromRcEntries(ySheet, [{ r: 1, c: 5, cell }])

    const state = new SheetState(ySheet)
    const before = state.resolveCellIds(1, 5)!
    const keyBefore = cellIdKey(before.rowId, before.colId)

    state.insertCols(1, 2)

    const after = state.resolveCellIds(1, 7)!
    expect(after.rowId).toBe(before.rowId)
    expect(after.colId).toBe(before.colId)
    expect(state.getCellData(1, 7)?.v).toBe(99)
    expect((ySheet.get('cells') as Y.Map<unknown>).has(keyBefore)).toBe(true)
  })
})

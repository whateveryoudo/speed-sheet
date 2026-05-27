import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { Sheet, initLayoutFromRcEntries } from '@speed-sheet/core'
import {
  displayFormulaToInternal,
  hasInternalRefs,
  internalFormulaToDisplay,
} from '../formula-bindings'
import { createFormulaContext } from '../context'
import { FormulaExtension } from '../extension'

describe('formula stable bindings', () => {
  it('converts A1 display to internal rowId:colId refs', () => {
    const ydoc = new Y.Doc()
    const ySheet = new Y.Map<unknown>()
    ydoc.getMap('sheets').set('0', ySheet)
    const cell = new Y.Map<unknown>()
    cell.set('v', 10)
    initLayoutFromRcEntries(ySheet, [{ r: 0, c: 0, cell }])

    const sheet = new Sheet({ ydoc })
    const ctx = createFormulaContext(sheet)
    const internal = displayFormulaToInternal('=A1+1', ctx, '0')
    expect(hasInternalRefs(internal)).toBe(true)
    expect(internal).toMatch(/#r_[A-Za-z0-9_-]+:c_[A-Za-z0-9_-]+#/)
  })

  it('keeps formula semantics after insert row (display A1 moves, internal unchanged)', () => {
    const ydoc = new Y.Doc()
    const ySheet = new Y.Map<unknown>()
    ydoc.getMap('sheets').set('0', ySheet)

    const src = new Y.Map<unknown>()
    src.set('v', 5)
    const dst = new Y.Map<unknown>()
    initLayoutFromRcEntries(ySheet, [
      { r: 0, c: 0, cell: src },
      { r: 1, c: 0, cell: dst },
    ])

    const sheet = new Sheet({ ydoc, extensions: [FormulaExtension] })

    const ctx = createFormulaContext(sheet)
    const ids = sheet.state.resolveCellIds(1, 0)!
    const internal = `=#${ids.rowId}:${ids.colId}#`
    sheet.state.setCell(1, 0, { f: internal, v: null, m: '' })

    const displayBefore = internalFormulaToDisplay(internal, ctx, '0')
    expect(displayBefore).toBe('=A2')

    sheet.state.insertRows(0, 1)

    const displayAfter = internalFormulaToDisplay(internal, ctx, '0')
    expect(displayAfter).toBe('=A3')
    expect(sheet.state.getCellData(2, 0)?.f).toBe(internal)
  })

  it('recalculates sum after insert row (semantic rowId)', () => {
    const ydoc = new Y.Doc()
    const ySheet = new Y.Map<unknown>()
    ydoc.getMap('sheets').set('0', ySheet)

    const a1 = new Y.Map<unknown>()
    a1.set('v', 10)
    const a3 = new Y.Map<unknown>()
    a3.set('v', 30)
    initLayoutFromRcEntries(ySheet, [
      { r: 0, c: 0, cell: a1 },
      { r: 2, c: 0, cell: a3 },
    ])

    const sheet = new Sheet({ ydoc, extensions: [FormulaExtension] })
    const ctx = createFormulaContext(sheet)

    sheet.chain().setCellFormula({ r: 2, c: 2, formula: '=A1+A3' }).run()
    const formulaCell = sheet.state.getCellData(2, 2)
    expect(hasInternalRefs(String(formulaCell?.f))).toBe(true)
    expect(formulaCell?.ef).toBeUndefined()
    expect(formulaCell?.v).toBe(40)
    sheet.chain().insertRows({ at: 2, count: 1 }).run()

    const display = internalFormulaToDisplay(
      String(sheet.state.getCellData(3, 2)?.f),
      ctx,
      '0',
    )
    expect(display).toBe('=A1+A4')
    expect(sheet.state.getCellData(3, 2)?.v).toBe(40)
  })
})

import { describe, it, expect } from 'vitest'
import { Sheet } from '../Sheet'
import { mapRowIndexAfterMove } from '../renderer/row-move-hit'

describe('moveRows', () => {
  it('reorders rowOrder and preserves cell by rowId', () => {
    const sheet = new Sheet()
    const state = sheet.state
    const rowIds = state.rowOrder.toArray()

    state.setCell(0, 0, { v: 'A', m: 'A' })
    state.setCell(1, 0, { v: 'B', m: 'B' })

    sheet.chain().moveRows({ from: 1, insertBefore: 3, count: 1 }).run()

    expect(state.rowOrder.get(0)).toBe(rowIds[0])
    expect(state.rowOrder.get(1)).toBe(rowIds[2])
    expect(state.rowOrder.get(2)).toBe(rowIds[1])
    expect(state.rowOrder.get(3)).toBe(rowIds[3])

    expect(state.getCellData(0, 0)?.v).toBe('A')
    expect(state.getCellData(2, 0)?.v).toBe('B')
  })

  it('mapRowIndexAfterMove matches permutation', () => {
    const from = 1
    const count = 2
    const insertAt = 4
    expect(mapRowIndexAfterMove(1, from, count, insertAt)).toBe(4)
    expect(mapRowIndexAfterMove(2, from, count, insertAt)).toBe(5)
    expect(mapRowIndexAfterMove(0, from, count, insertAt)).toBe(0)
    expect(mapRowIndexAfterMove(4, from, count, insertAt)).toBe(2)
  })
})

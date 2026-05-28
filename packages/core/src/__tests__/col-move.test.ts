import { describe, it, expect } from 'vitest'
import { Sheet } from '../Sheet'
import { mapColIndexAfterMove } from '../renderer/col-move-hit'

describe('moveCols', () => {
  it('reorders colOrder and preserves cell by colId', () => {
    const sheet = new Sheet()
    const state = sheet.state
    const colIds = state.colOrder.toArray()

    state.setCell(0, 0, { v: 'A', m: 'A' })
    state.setCell(0, 1, { v: 'B', m: 'B' })

    sheet.chain().moveCols({ from: 1, insertBefore: 3, count: 1 }).run()

    expect(state.colOrder.get(0)).toBe(colIds[0])
    expect(state.colOrder.get(1)).toBe(colIds[2])
    expect(state.colOrder.get(2)).toBe(colIds[1])
    expect(state.colOrder.get(3)).toBe(colIds[3])

    expect(state.getCellData(0, 0)?.v).toBe('A')
    expect(state.getCellData(0, 2)?.v).toBe('B')
  })

  it('mapColIndexAfterMove matches permutation', () => {
    const from = 1
    const count = 2
    const insertAt = 4
    expect(mapColIndexAfterMove(1, from, count, insertAt)).toBe(4)
    expect(mapColIndexAfterMove(2, from, count, insertAt)).toBe(5)
    expect(mapColIndexAfterMove(0, from, count, insertAt)).toBe(0)
    expect(mapColIndexAfterMove(4, from, count, insertAt)).toBe(2)
  })
})

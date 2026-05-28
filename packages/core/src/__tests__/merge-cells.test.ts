import { describe, it, expect } from 'vitest'
import { Sheet } from '../Sheet'

describe('mergeCells command', () => {
  it('writes merge range and getMergeRanges returns it', () => {
    const sheet = new Sheet()
    sheet.chain().selectRange({ row: [0, 1], column: [0, 1] }).run()
    sheet.chain().mergeCells().run()
    const merges = sheet.getMergeRanges()
    expect(merges).toHaveLength(1)
    expect(merges[0]).toMatchObject({ r: 0, c: 0, rs: 2, cs: 2 })
    const sel = sheet.state.getSelection()
    expect(sel.row).toEqual([0, 1])
    expect(sel.column).toEqual([0, 1])
    expect(sel.anchor).toEqual({ r: 0, c: 0 })
  })

  it('unmergeCells removes merge and keeps anchor value', () => {
    const sheet = new Sheet()
    sheet.chain().selectRange({ row: [0, 1], column: [0, 1] }).run()
    sheet.chain().mergeCells().run()
    sheet.chain().setCellValue({ r: 0, c: 0, value: 'keep' }).run()
    sheet.chain().unmergeCells().run()
    expect(sheet.getMergeRanges()).toHaveLength(0)
    expect(sheet.state.getCellData(0, 0)?.v).toBe('keep')
  })

  it('no-op for 1x1 selection', () => {
    const sheet = new Sheet()
    sheet.chain().selectRange({ row: [0, 0], column: [0, 0] }).run()
    sheet.chain().mergeCells().run()
    expect(sheet.getMergeRanges()).toHaveLength(0)
  })
})

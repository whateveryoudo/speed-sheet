import { describe, it, expect } from 'vitest'
import { Sheet } from '../Sheet'
import {
  detectExpandedRange,
  formatRangeLabel,
  compareCellValues,
  sortRange,
} from '../sort'

describe('sort logic & range expansion', () => {
  it('compareCellValues handles numbers, strings and empty values', () => {
    // 升序数字
    expect(compareCellValues(2, 5, true)).toBeLessThan(0)
    expect(compareCellValues(10, 5, true)).toBeGreaterThan(0)
    // 降序数字
    expect(compareCellValues(2, 5, false)).toBeGreaterThan(0)

    // 空值永远排在最后
    expect(compareCellValues('', 5, true)).toBeGreaterThan(0)
    expect(compareCellValues(5, '', true)).toBeLessThan(0)
    expect(compareCellValues('', 5, false)).toBeGreaterThan(0)

    // 字符串比较
    expect(compareCellValues('abc', 'def', true)).toBeLessThan(0)
    expect(compareCellValues('def', 'abc', true)).toBeGreaterThan(0)
  })

  it('detectExpandedRange expands to continuous table data', () => {
    const sheet = new Sheet()
    // A1:B2 数据
    // A1: 5, B1: 6
    // A2: 2, B2: 3
    sheet.chain().setCellValue({ r: 0, c: 0, value: '5' }).run()
    sheet.chain().setCellValue({ r: 0, c: 1, value: '6' }).run()
    sheet.chain().setCellValue({ r: 1, c: 0, value: '2' }).run()
    sheet.chain().setCellValue({ r: 1, c: 1, value: '3' }).run()

    // 仅选中 A1 (0, 0)
    const sel = { row: [0, 0], column: [0, 0] } as any
    const box = detectExpandedRange(sheet.state, sel)

    expect(box).toEqual({ r0: 0, r1: 1, c0: 0, c1: 1 })
    expect(formatRangeLabel(box)).toBe('A1:B2')
  })

  it('sortRange sorts rows in ascending and descending order together with other columns', () => {
    const sheet = new Sheet()
    // A1: 5, B1: 'six'
    // A2: 2, B2: 'two'
    // A3: 9, B3: 'nine'
    sheet.chain().setCellValue({ r: 0, c: 0, value: '5' }).run()
    sheet.chain().setCellValue({ r: 0, c: 1, value: 'six' }).run()
    sheet.chain().setCellValue({ r: 1, c: 0, value: '2' }).run()
    sheet.chain().setCellValue({ r: 1, c: 1, value: 'two' }).run()
    sheet.chain().setCellValue({ r: 2, c: 0, value: '9' }).run()
    sheet.chain().setCellValue({ r: 2, c: 1, value: 'nine' }).run()

    // 按 A 列 (c=0) 升序排整块 A1:B3
    sortRange(sheet.state, {
      range: { r0: 0, r1: 2, c0: 0, c1: 1 },
      sortCol: 0,
      ascending: true,
    })

    // 第 0 行应该是 2 / two
    expect(sheet.state.getCellData(0, 0)?.v).toBe(2)
    expect(sheet.state.getCellData(0, 1)?.v).toBe('two')

    // 第 1 行应该是 5 / six
    expect(sheet.state.getCellData(1, 0)?.v).toBe(5)
    expect(sheet.state.getCellData(1, 1)?.v).toBe('six')

    // 第 2 行应该是 9 / nine
    expect(sheet.state.getCellData(2, 0)?.v).toBe(9)
    expect(sheet.state.getCellData(2, 1)?.v).toBe('nine')

    // 再次按 A 列 (c=0) 降序排
    sortRange(sheet.state, {
      range: { r0: 0, r1: 2, c0: 0, c1: 1 },
      sortCol: 0,
      ascending: false,
    })

    expect(sheet.state.getCellData(0, 0)?.v).toBe(9)
    expect(sheet.state.getCellData(0, 1)?.v).toBe('nine')
    expect(sheet.state.getCellData(1, 0)?.v).toBe(5)
    expect(sheet.state.getCellData(1, 1)?.v).toBe('six')
    expect(sheet.state.getCellData(2, 0)?.v).toBe(2)
    expect(sheet.state.getCellData(2, 1)?.v).toBe('two')
  })
})

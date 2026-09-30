import { describe, it, expect } from 'vitest'
import {
  calcAutofillTarget,
  shiftFormulaReferences,
  fill1DSequence,
} from '../autofill/autofill-logic'

describe('autofill-logic', () => {
  it('calculates autofill target range and direction correctly', () => {
    const source = { r0: 1, c0: 1, r1: 2, c1: 2 }

    // 向下拖动到第 5 行
    const down = calcAutofillTarget(source, 5, 2)
    expect(down?.direction).toBe('down')
    expect(down?.targetRange).toEqual({ r0: 3, r1: 5, c0: 1, c1: 2 })
    expect(down?.fullRange).toEqual({ r0: 1, r1: 5, c0: 1, c1: 2 })

    // 向右拖动到第 4 列
    const right = calcAutofillTarget(source, 2, 4)
    expect(right?.direction).toBe('right')
    expect(right?.targetRange).toEqual({ r0: 1, r1: 2, c0: 3, c1: 4 })
    expect(right?.fullRange).toEqual({ r0: 1, r1: 2, c0: 1, c1: 4 })

    // 选区内部返回 null
    const inside = calcAutofillTarget(source, 1, 1)
    expect(inside).toBeNull()
  })

  it('shifts formula references correctly', () => {
    // 相对引用随偏移移动
    expect(shiftFormulaReferences('=A1+B1', 1, 0)).toBe('=A2+B2')
    expect(shiftFormulaReferences('=A1+B1', 0, 1)).toBe('=B1+C1')
    expect(shiftFormulaReferences('=SUM(A1:B5)', 2, 1)).toBe('=SUM(B3:C7)')

    // 绝对引用 ($) 保持固定
    expect(shiftFormulaReferences('=$A$1+B$1+$C1', 2, 2)).toBe('=$A$1+D$1+$C3')
  })

  it('extrapolates numeric sequences', () => {
    // 1 个数字：默认步长 1 递增 (10 -> 11, 12, 13)
    const single = fill1DSequence([{ v: 10 }], 3, { direction: 'forward', axis: 'row' })
    expect(single.map((c) => c.v)).toEqual([11, 12, 13])

    // 2 个数字：线性递增 (1, 2 -> 3, 4, 5)
    const seq = fill1DSequence([{ v: 1 }, { v: 2 }], 3, { direction: 'forward', axis: 'row' })
    expect(seq.map((c) => c.v)).toEqual([3, 4, 5])

    // 2 个数字：较大步长 (10, 20 -> 30, 40)
    const step10 = fill1DSequence([{ v: 10 }, { v: 20 }], 2, { direction: 'forward', axis: 'row' })
    expect(step10.map((c) => c.v)).toEqual([30, 40])
  })

  it('extrapolates cyclic day of week and month sequences', () => {
    const daySeq = fill1DSequence([{ v: '星期二' }], 3, { direction: 'forward', axis: 'row' })
    expect(daySeq.map((c) => c.v)).toEqual(['星期三', '星期四', '星期五'])

    const monthSeq = fill1DSequence([{ v: 'January' }], 2, { direction: 'forward', axis: 'row' })
    expect(monthSeq.map((c) => c.v)).toEqual(['February', 'March'])

    const cnMonthSeq = fill1DSequence([{ v: '一月' }], 2, { direction: 'forward', axis: 'row' })
    expect(cnMonthSeq.map((c) => c.v)).toEqual(['二月', '三月'])
  })

  it('extrapolates text with number suffixes', () => {
    const textSeq = fill1DSequence([{ v: '第1周' }], 3, { direction: 'forward', axis: 'row' })
    expect(textSeq.map((c) => c.v)).toEqual(['第2周', '第3周', '第4周'])

    const itemSeq = fill1DSequence([{ v: 'Item 01' }], 2, { direction: 'forward', axis: 'row' })
    expect(itemSeq.map((c) => c.v)).toEqual(['Item 02', 'Item 03'])
  })
})

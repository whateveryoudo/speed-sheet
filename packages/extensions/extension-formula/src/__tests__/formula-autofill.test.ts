import { describe, expect, it } from 'vitest'
import { Sheet } from '@speed-sheet/core'
import { FormulaExtension } from '../extension'

describe('Formula autofill', () => {
  it('autofills formulas, shifts relative references, and evaluates results', () => {
    const sheet = new Sheet({
      extensions: [FormulaExtension],
    })

    // 准备数据：
    // B1=10, C1=20
    // B2=30, C2=40
    // B3=50, C3=60
    sheet.chain().setCellValue({ r: 0, c: 1, value: '10' }).run()
    sheet.chain().setCellValue({ r: 0, c: 2, value: '20' }).run()
    sheet.chain().setCellValue({ r: 1, c: 1, value: '30' }).run()
    sheet.chain().setCellValue({ r: 1, c: 2, value: '40' }).run()
    sheet.chain().setCellValue({ r: 2, c: 1, value: '50' }).run()
    sheet.chain().setCellValue({ r: 2, c: 2, value: '60' }).run()

    // 在 D1 输入公式 =B1+C1 (10+20 = 30)
    sheet.chain().setCellValue({ r: 0, c: 3, value: '=B1+C1' }).run()
    expect(sheet.state.getCellData(0, 3)?.v).toBe(30)
    expect(sheet.state.getCellData(0, 3)?.m).toBe('30')

    // 从 D1 向下拖拽填充到 D2:D3
    sheet.chain().autofill({
      sourceRange: { r0: 0, c0: 3, r1: 0, c1: 3 },
      targetRange: { r0: 1, c0: 3, r1: 2, c1: 3 },
      direction: 'down',
    }).run()

    // D2 应该自增为 =B2+C2，结果为 30+40 = 70
    const d2 = sheet.state.getCellData(1, 3)
    expect(d2?.v).toBe(70)
    expect(d2?.m).toBe('70')

    // D3 应该自增为 =B3+C3，结果为 50+60 = 110
    const d3 = sheet.state.getCellData(2, 3)
    expect(d3?.v).toBe(110)
    expect(d3?.m).toBe('110')
  })

  it('preserves absolute references ($) during autofill', () => {
    const sheet = new Sheet({
      extensions: [FormulaExtension],
    })

    sheet.chain().setCellValue({ r: 0, c: 0, value: '100' }).run() // A1 = 100
    sheet.chain().setCellValue({ r: 0, c: 1, value: '1' }).run()   // B1 = 1
    sheet.chain().setCellValue({ r: 1, c: 1, value: '2' }).run()   // B2 = 2

    // C1 = $A$1 + B1 (100 + 1 = 101)
    sheet.chain().setCellValue({ r: 0, c: 2, value: '=$A$1+B1' }).run()
    expect(sheet.state.getCellData(0, 2)?.v).toBe(101)

    // 向下填充到 C2: C2 应为 =$A$1+B2 (100 + 2 = 102)
    sheet.chain().autofill({
      sourceRange: { r0: 0, c0: 2, r1: 0, c1: 2 },
      targetRange: { r0: 1, c0: 2, r1: 1, c1: 2 },
      direction: 'down',
    }).run()

    const c2 = sheet.state.getCellData(1, 2)
    expect(c2?.v).toBe(102)
  })
})

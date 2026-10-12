import { describe, it, expect } from 'vitest'
import { Sheet } from '../Sheet'

describe('BorderExtension', () => {
  it('should apply and clear borders correctly on selection', () => {
    const sheet = new Sheet()
    sheet.chain().selectCell({ r: 1, c: 1 }).run()

    // 1. 设置全边框
    sheet.chain().setBorder({
      borderType: 'all',
      color: '#ff0000',
      style: 1,
    }).run()

    const border1_1 = sheet.state.getBorder(1, 1)
    expect(border1_1).not.toBeNull()
    expect(border1_1?.t?.color).toBe('#ff0000')
    expect(border1_1?.b?.color).toBe('#ff0000')
    expect(border1_1?.l?.color).toBe('#ff0000')
    expect(border1_1?.r?.color).toBe('#ff0000')

    // 2. 清除边框
    sheet.chain().clearBorder().run()
    const cleared = sheet.state.getBorder(1, 1)
    expect(cleared).toBeNull()
  })

  it('should apply outside border across a 2x2 range', () => {
    const sheet = new Sheet()
    sheet.chain().selectRange({
      row: [1, 2],
      column: [1, 2],
    }).run()

    sheet.chain().setBorder({
      borderType: 'outside',
      color: '#0000ff',
      style: 8,
    }).run()

    const b11 = sheet.state.getBorder(1, 1)
    const b12 = sheet.state.getBorder(1, 2)
    const b21 = sheet.state.getBorder(2, 1)
    const b22 = sheet.state.getBorder(2, 2)

    expect(b11?.t?.color).toBe('#0000ff')
    expect(b11?.l?.color).toBe('#0000ff')
    expect(b11?.b).toBeUndefined()
    expect(b11?.r).toBeUndefined()

    expect(b12?.t?.color).toBe('#0000ff')
    expect(b12?.r?.color).toBe('#0000ff')

    expect(b21?.b?.color).toBe('#0000ff')
    expect(b21?.l?.color).toBe('#0000ff')

    expect(b22?.b?.color).toBe('#0000ff')
    expect(b22?.r?.color).toBe('#0000ff')
  })

  it('should shift borders when inserting or deleting rows/cols', () => {
    const sheet = new Sheet()
    sheet.chain().selectCell({ r: 2, c: 2 }).run()

    sheet.chain().setBorder({
      borderType: 'all',
      color: '#000000',
      style: 1,
    }).run()

    expect(sheet.state.getBorder(2, 2)).not.toBeNull()

    // 向上插入 1 行 -> (2, 2) 移到 (3, 2)
    sheet.state.insertRows(0, 1)
    expect(sheet.state.getBorder(2, 2)).toBeNull()
    expect(sheet.state.getBorder(3, 2)).not.toBeNull()

    // 删除第 0 行 -> 回到 (2, 2)
    sheet.state.deleteRows(0, 1)
    expect(sheet.state.getBorder(2, 2)).not.toBeNull()
  })
})

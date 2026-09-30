import { describe, it, expect } from 'vitest'
import {
  formatCellValue,
  adjustFormatDecimalPlaces,
  getFormatDecimalPlaces,
} from '../format'

describe('number-format', () => {
  it('formats general and text correctly', () => {
    expect(formatCellValue(123, { fa: 'General', t: 'g' }).m).toBe('123')
    expect(formatCellValue(123, { fa: '@', t: 's' }).m).toBe('123')
    expect(formatCellValue('hello', { fa: '@', t: 's' }).m).toBe('hello')
  })

  it('formats numbers with thousands separators and decimals', () => {
    expect(formatCellValue(1234567.89, { fa: '#,##0.00', t: 'n' }).m).toBe('1,234,567.89')
    expect(formatCellValue(1000, { fa: '#,##0', t: 'n' }).m).toBe('1,000')
    expect(formatCellValue(5, { fa: '0.000', t: 'n' }).m).toBe('5.000')
  })

  it('formats percentages correctly', () => {
    expect(formatCellValue(0.125, { fa: '0.00%', t: 'n' }).m).toBe('12.50%')
    expect(formatCellValue(1, { fa: '0%', t: 'n' }).m).toBe('100%')
  })

  it('formats currencies correctly', () => {
    expect(formatCellValue(99.5, { fa: '¥#,##0.00', t: 'n' }).m).toBe('¥99.50')
    expect(formatCellValue(1234.5, { fa: '$#,##0.00', t: 'n' }).m).toBe('$1,234.50')
  })

  it('formats dates and times correctly', () => {
    const d = new Date(2018, 0, 8, 13, 0, 0)
    expect(formatCellValue(d, { fa: 'YYYY-MM-DD', t: 'd' }).m).toBe('2018-01-08')
    expect(formatCellValue(d, { fa: 'YYYY年M月D日', t: 'd' }).m).toBe('2018年1月8日')
    expect(formatCellValue(d, { fa: 'HH:mm:ss', t: 'd' }).m).toBe('13:00:00')
    expect(formatCellValue(d, { fa: '1:00 PM', t: 'd' }).m).toBe('1:00 PM')
    expect(formatCellValue(d, { fa: 'YYYY-MM-DD HH:mm:ss', t: 'd' }).m).toBe('2018-01-08 13:00:00')

    // 序列号测试（支持正数与语雀一致的负数倒推）
    expect(formatCellValue(5, { fa: 'YYYY-MM-DD', t: 'd' }).m).toBe('1900-01-04')
    expect(formatCellValue(5, { fa: 'YYYY-MM-DD HH:mm:ss', t: 'd' }).m).toBe('1900-01-04 00:00:00')
    expect(formatCellValue(-5, { fa: 'YYYY-MM-DD', t: 'd' }).m).toBe('1899-12-25')
    expect(formatCellValue(-3, { fa: 'YYYY/MM/DD', t: 'd' }).m).toBe('1899/12/27')
  })

  it('adjusts decimal places correctly', () => {
    const f1 = { fa: '#,##0.00', t: 'n' as const }
    expect(getFormatDecimalPlaces(f1.fa)).toBe(2)

    const increased = adjustFormatDecimalPlaces(f1, 123.45, 1)
    expect(increased.fa).toBe('#,##0.000')

    const decreased = adjustFormatDecimalPlaces(f1, 123.45, -1)
    expect(decreased.fa).toBe('#,##0.0')

    const zeroDec = adjustFormatDecimalPlaces(decreased, 123.45, -1)
    expect(zeroDec.fa).toBe('#,##0')
  })
})

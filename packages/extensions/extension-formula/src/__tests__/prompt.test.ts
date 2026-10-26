import { describe, expect, it } from 'vitest'
import { getFormulaPromptContext, parseSyntaxParameters } from '../registry/prompt'

describe('parseSyntaxParameters', () => {
  it('parses typical formula syntax into parameter items', () => {
    expect(parseSyntaxParameters('SUM(数值1, [数值2], …)')).toEqual([
      '数值1',
      '[数值2]',
      '…',
    ])
    expect(parseSyntaxParameters('IF(logical_test, [value_if_true], [value_if_false])')).toEqual([
      'logical_test',
      '[value_if_true]',
      '[value_if_false]',
    ])
  })
})

describe('getFormulaPromptContext', () => {
  it('returns none for non-formula text', () => {
    expect(getFormulaPromptContext('Hello', 3)).toEqual({ type: 'none' })
    expect(getFormulaPromptContext('', 0)).toEqual({ type: 'none' })
  })

  it('detects search context on =S', () => {
    const ctx = getFormulaPromptContext('=S', 2)
    expect(ctx.type).toBe('search')
    if (ctx.type === 'search') {
      expect(ctx.query).toBe('S')
      expect(ctx.replaceRange).toEqual([1, 2])
      expect(ctx.candidates.length).toBeGreaterThan(0)
      expect(ctx.candidates.some((c) => c.name === 'SUM')).toBe(true)
    }
  })

  it('detects search context inside nested expression =SUM(A1, AV', () => {
    const text = '=SUM(A1, AV'
    const ctx = getFormulaPromptContext(text, text.length)
    expect(ctx.type).toBe('search')
    if (ctx.type === 'search') {
      expect(ctx.query).toBe('AV')
      expect(ctx.candidates.some((c) => c.name === 'AVERAGE')).toBe(true)
    }
  })

  it('detects help context immediately after left paren =SUM(', () => {
    const text = '=SUM('
    const ctx = getFormulaPromptContext(text, text.length)
    expect(ctx.type).toBe('help')
    if (ctx.type === 'help') {
      expect(ctx.functionName).toBe('SUM')
      expect(ctx.paramIndex).toBe(0)
      expect(ctx.activeParamIndex).toBe(0)
    }
  })

  it('detects help context for subsequent parameters =SUM(A1, ', () => {
    const text = '=SUM(A1, '
    const ctx = getFormulaPromptContext(text, text.length)
    expect(ctx.type).toBe('help')
    if (ctx.type === 'help') {
      expect(ctx.functionName).toBe('SUM')
      expect(ctx.paramIndex).toBe(1)
      expect(ctx.activeParamIndex).toBe(1)
    }
  })

  it('handles nested functions properly', () => {
    // 处于 AVERAGE 内部
    const text1 = '=SUM(AVERAGE(B1, '
    const ctx1 = getFormulaPromptContext(text1, text1.length)
    expect(ctx1.type).toBe('help')
    if (ctx1.type === 'help') {
      expect(ctx1.functionName).toBe('AVERAGE')
      expect(ctx1.paramIndex).toBe(1)
    }

    // AVERAGE 已闭合，当前处于 SUM 的第 2 个参数
    const text2 = '=SUM(AVERAGE(B1, B2), '
    const ctx2 = getFormulaPromptContext(text2, text2.length)
    expect(ctx2.type).toBe('help')
    if (ctx2.type === 'help') {
      expect(ctx2.functionName).toBe('SUM')
      expect(ctx2.paramIndex).toBe(1)
    }
  })

  it('ignores commas inside quotes', () => {
    const text = '=IF("hello, world", '
    const ctx = getFormulaPromptContext(text, text.length)
    expect(ctx.type).toBe('help')
    if (ctx.type === 'help') {
      expect(ctx.functionName).toBe('IF')
      expect(ctx.paramIndex).toBe(1)
    }
  })

  it('returns none while typing inside quotes', () => {
    const text = '=IF("hello'
    const ctx = getFormulaPromptContext(text, text.length)
    expect(ctx.type).toBe('none')
  })
})

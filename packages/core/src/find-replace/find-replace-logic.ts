import type { Sheet } from '../Sheet'
import type { SheetState } from '../state/SheetState'
import type { CellAttributes } from '@speed-sheet/shared'
import type { FindMatch, FindOptions } from './types'

export function getCellSearchableText(data: CellAttributes | null | undefined): string {
  if (!data) return ''
  if (data.m !== undefined && data.m !== null) return String(data.m)
  if (data.v !== undefined && data.v !== null) return String(data.v)
  if (data.f !== undefined && data.f !== null) return String(data.f)
  return ''
}

export function isMatch(text: string, query: string, options: FindOptions = {}): boolean {
  if (!query) return false
  const { caseSensitive = false, matchEntireCell = false } = options
  const target = caseSensitive ? text : text.toLowerCase()
  const q = caseSensitive ? query : query.toLowerCase()
  if (matchEntireCell) {
    return target === q
  }
  return target.includes(q)
}

/**
 * 遍历当前表格中所有非空单元格，按 (r ASC, c ASC) 排序返回匹配项列表
 */
export function findMatchesInSheet(
  sheetState: SheetState,
  query: string,
  options: FindOptions = {},
): FindMatch[] {
  if (!query) return []
  const cells = sheetState.getAllCells()
  const matches: FindMatch[] = []

  for (const item of cells) {
    const text = getCellSearchableText(item.data)
    if (isMatch(text, query, options)) {
      matches.push({
        r: item.r,
        c: item.c,
        value: text,
      })
    }
  }

  matches.sort((a, b) => (a.r !== b.r ? a.r - b.r : a.c - b.c))
  return matches
}

/**
 * 计算相对于当前选中单元格 (activeR, activeC) 的下一个或上一个匹配项索引。
 * 当当前激活单元格不在匹配项列表里时，向后或向前自动寻找最近的匹配项。
 */
export function getNextMatchIndex(
  matches: FindMatch[],
  activeR: number,
  activeC: number,
  direction: 'next' | 'prev' = 'next',
): number {
  if (!matches.length) return -1

  const exactIdx = matches.findIndex((m) => m.r === activeR && m.c === activeC)
  if (exactIdx !== -1) {
    if (direction === 'next') {
      return (exactIdx + 1) % matches.length
    }
    return (exactIdx - 1 + matches.length) % matches.length
  }

  // 当前选中不在匹配项内
  if (direction === 'next') {
    // 寻找处于 (activeR, activeC) 之后的第一个匹配项
    const nextIdx = matches.findIndex(
      (m) => m.r > activeR || (m.r === activeR && m.c > activeC),
    )
    return nextIdx !== -1 ? nextIdx : 0
  } else {
    // 寻找处于 (activeR, activeC) 之前的最后一个匹配项
    for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i]
      if (m.r < activeR || (m.r === activeR && m.c < activeC)) {
        return i
      }
    }
    return matches.length - 1
  }
}

export function replaceTextInString(
  text: string,
  query: string,
  replaceWith: string,
  options: FindOptions = {},
): string {
  const { caseSensitive = false, matchEntireCell = false } = options
  if (matchEntireCell) {
    if (caseSensitive ? text === query : text.toLowerCase() === query.toLowerCase()) {
      return replaceWith
    }
    return text
  }
  const flags = caseSensitive ? 'g' : 'gi'
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escapedQuery, flags), replaceWith)
}

/**
 * 替换单个单元格内容
 */
export function replaceCellMatch(
  sheet: Sheet,
  r: number,
  c: number,
  query: string,
  replaceWith: string,
  options: FindOptions = {},
): boolean {
  const cellData = sheet.state.getCellData(r, c)
  if (!cellData) return false
  const oldText = getCellSearchableText(cellData)
  const newText = replaceTextInString(oldText, query, replaceWith, options)
  if (newText === oldText) return false

  let newV: string | number = newText
  if (typeof cellData.v === 'number' && !isNaN(Number(newText)) && newText.trim() !== '') {
    newV = Number(newText)
  }

  sheet.chain().setCell(r, c, {
    v: newV,
    m: String(newText),
  }).run()

  return true
}

/**
 * 全部替换
 */
export function replaceAllMatches(
  sheet: Sheet,
  query: string,
  replaceWith: string,
  options: FindOptions = {},
): number {
  const matches = findMatchesInSheet(sheet.state, query, options)
  if (!matches.length) return 0

  let replacedCount = 0
  const chain = sheet.chain()
  for (const m of matches) {
    const cellData = sheet.state.getCellData(m.r, m.c)
    if (!cellData) continue
    const oldText = getCellSearchableText(cellData)
    const newText = replaceTextInString(oldText, query, replaceWith, options)
    if (newText !== oldText) {
      let newV: string | number = newText
      if (typeof cellData.v === 'number' && !isNaN(Number(newText)) && newText.trim() !== '') {
        newV = Number(newText)
      }
      chain.setCell(m.r, m.c, {
        v: newV,
        m: String(newText),
      })
      replacedCount++
    }
  }

  chain.run()
  return replacedCount
}

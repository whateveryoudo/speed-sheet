/** A1 风格引用解析（与 Excel / Luckysheet 子集对齐） */

export interface CellAddress {
  r: number
  c: number
}

export interface RangeAddress {
  row: [number, number]
  column: [number, number]
}

export interface SheetRef {
  /** 工作表名（展示名）或 id */
  sheet?: string
  cell?: CellAddress
  range?: RangeAddress
  rowLock?: boolean
  colLock?: boolean
  endRowLock?: boolean
  endColLock?: boolean
}

export function normalizeFormulaInput(raw: string): string {
  return raw
    .replace(/\uFF1D/g, '=') // ＝
    .replace(/\uFF08/g, '(') // （
    .replace(/\uFF09/g, ')') // ）
    .replace(/\uFF0C/g, ',') // ，
    .replace(/\uFF1A/g, ':') // ：
    .replace(/\uFF0D/g, '-') // －
    .replace(/\u2013/g, '-') // – en-dash
    .replace(/\u2014/g, '-') // — em-dash
    .replace(/\uFF0B/g, '+') // ＋
    .replace(/\uFF0A/g, '*') // ＊
    .replace(/\uFF0F/g, '/') // ／
}

/** 列字母 → 0-based 列号 */
export function letterToCol(letters: string): number {
  let n = 0
  const s = letters.toUpperCase()
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64)
  }
  return n - 1
}

export function colToLetter(c: number): string {
  let s = ''
  let n = c
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

export function formatA1(r: number, c: number, rowLock = false, colLock = false): string {
  return `${colLock ? '$' : ''}${colToLetter(c)}${rowLock ? '$' : ''}${r + 1}`
}

/** 解析 A1 或 A1:B10 */
export function parseRefToken(token: string): SheetRef | null {
  const trimmed = token.trim()
  if (!trimmed) return null

  let sheet: string | undefined
  let local = trimmed

  const bang = trimmed.indexOf('!')
  if (bang >= 0) {
    let sheetPart = trimmed.slice(0, bang)
    if (sheetPart.startsWith("'") && sheetPart.endsWith("'")) {
      sheetPart = sheetPart.slice(1, -1).replace(/''/g, "'")
    }
    sheet = sheetPart
    local = trimmed.slice(bang + 1)
  }

  const rangeMatch = /^(\$?)([A-Za-z]+)(\$?)(\d+):(\$?)([A-Za-z]+)(\$?)(\d+)$/.exec(local)
  if (rangeMatch) {
    const r0 = Number(rangeMatch[4]) - 1
    const c0 = letterToCol(rangeMatch[2])
    const r1 = Number(rangeMatch[8]) - 1
    const c1 = letterToCol(rangeMatch[6])
    return {
      sheet,
      range: {
        row: [Math.min(r0, r1), Math.max(r0, r1)],
        column: [Math.min(c0, c1), Math.max(c0, c1)],
      },
      colLock: !!rangeMatch[1],
      rowLock: !!rangeMatch[3],
      endColLock: !!rangeMatch[5],
      endRowLock: !!rangeMatch[7],
    }
  }

  const cellMatch = /^(\$?)([A-Za-z]+)(\$?)(\d+)$/.exec(local)
  if (cellMatch) {
    return {
      sheet,
      cell: {
        r: Number(cellMatch[4]) - 1,
        c: letterToCol(cellMatch[2]),
      },
      colLock: !!cellMatch[1],
      rowLock: !!cellMatch[3],
    }
  }

  return null
}

import { overlapsInternalRef } from './internal-ref-scan'

/** 从公式文本中提取全部 A1 引用 token（跳过 `#r_…:c_…#` 内部区域） */
export function extractRefTokens(formula: string): string[] {
  const tokens: string[] = []
  const re =
    /(?:'[^']+'!|[\w\u4e00-\u9fff\u3400-\u9fff]+!)?\$?[A-Za-z]{1,4}\$?\d+(?::\$?[A-Za-z]{1,4}\$?\d+)?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(formula)) !== null) {
    const start = m.index
    const end = start + m[0].length
    if (overlapsInternalRef(formula, start, end)) continue
    tokens.push(m[0])
  }
  return tokens
}

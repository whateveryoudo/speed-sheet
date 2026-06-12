import { colToLetter } from '@speed-sheet/core'

export function normalizeRect(
  row: [number, number],
  column: [number, number],
): { r0: number; r1: number; c0: number; c1: number } {
  return {
    r0: Math.min(row[0], row[1]),
    r1: Math.max(row[0], row[1]),
    c0: Math.min(column[0], column[1]),
    c1: Math.max(column[0], column[1]),
  }
}

export function cellInRange(
  r: number,
  c: number,
  row: [number, number],
  column: [number, number],
): boolean {
  const { r0, r1, c0, c1 } = normalizeRect(row, column)
  return r >= r0 && r <= r1 && c >= c0 && c <= c1
}

export function formatRangeA1(row: [number, number], column: [number, number]): string {
  const { r0, r1, c0, c1 } = normalizeRect(row, column)
  const a = `${colToLetter(c0)}${r0 + 1}`
  if (r0 === r1 && c0 === c1) return a
  return `${a}:${colToLetter(c1)}${r1 + 1}`
}

export function parseRangeA1(input: string): { row: [number, number]; column: [number, number] } | null {
  const t = input.trim().toUpperCase()
  if (!t) return null
  const parts = t.split(':')
  const parseCell = (s: string): { r: number; c: number } | null => {
    const m = /^([A-Z]+)(\d+)$/.exec(s.trim())
    if (!m) return null
    const letters = m[1]
    let col = 0
    for (let i = 0; i < letters.length; i++) {
      col = col * 26 + (letters.charCodeAt(i) - 64)
    }
    col -= 1
    const row = parseInt(m[2], 10) - 1
    if (row < 0 || col < 0) return null
    return { r: row, c: col }
  }
  const a = parseCell(parts[0])
  if (!a) return null
  if (parts.length === 1) {
    return { row: [a.r, a.r], column: [a.c, a.c] }
  }
  const b = parseCell(parts[1])
  if (!b) return null
  return {
    row: [Math.min(a.r, b.r), Math.max(a.r, b.r)],
    column: [Math.min(a.c, b.c), Math.max(a.c, b.c)],
  }
}

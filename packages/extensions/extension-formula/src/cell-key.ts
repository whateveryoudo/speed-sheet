import { cellKey } from '@speed-sheet/shared'

export function parseCellKey(key: string): { r: number; c: number } | null {
  const m = /^R(\d+)_C(\d+)$/.exec(key)
  if (!m) return null
  return { r: Number(m[1]), c: Number(m[2]) }
}

export function parseDepTargetKey(targetKey: string): { sheetId: string; r: number; c: number } | null {
  const idx = targetKey.indexOf(':')
  if (idx < 0) return null
  const sheetId = targetKey.slice(0, idx)
  const pos = parseCellKey(targetKey.slice(idx + 1))
  if (!pos) return null
  return { sheetId, ...pos }
}

export { cellKey }

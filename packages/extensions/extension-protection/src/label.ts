import { colToLetter } from '@speed-sheet/core'
import type { ProtectionEntry } from './types'
import { normalizeEntryBounds } from './range'

export function formatProtectionLabel(entry: ProtectionEntry): string {
  const { r0, r1, c0, c1 } = normalizeEntryBounds(entry)

  if (entry.kind === 'rows') {
    if (r0 === r1) return `对 ${r0 + 1} 行，设置保护`
    return `对 ${r0 + 1}:${r1 + 1} 行，设置保护`
  }

  if (entry.kind === 'cols') {
    if (c0 === c1) return `对 ${colToLetter(c0)} 列，设置保护`
    return `对 ${colToLetter(c0)}:${colToLetter(c1)} 列，设置保护`
  }

  if (r0 === r1 && c0 === c1) {
    return `对 ${colToLetter(c0)}${r0 + 1} 单元格，设置保护`
  }

  return `对 ${colToLetter(c0)}${r0 + 1}:${colToLetter(c1)}${r1 + 1} 区域，设置保护`
}

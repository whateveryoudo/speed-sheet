/**
 * 颜色工具函数：支持 Hex ↔ ARGB (ExcelJS 使用 8 位 ARGB，例如 FFFFFFFF)
 */

export function hexToArgb(hex?: string | null): string | undefined {
  if (!hex || typeof hex !== 'string') return undefined
  let clean = hex.trim()
  if (clean.startsWith('#')) {
    clean = clean.slice(1)
  }

  // 3 位十六进制缩写 #FFF -> FFFFFF
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('')
  }

  // 6 位十六进制 RRGGBB -> FFRRGGBB (默认 Alpha 为 FF 不透明)
  if (clean.length === 6) {
    return `FF${clean.toUpperCase()}`
  }

  // 8 位十六进制 RRGGBBAA -> AARRGGBB
  if (clean.length === 8) {
    const r = clean.slice(0, 2)
    const g = clean.slice(2, 4)
    const b = clean.slice(4, 6)
    const a = clean.slice(6, 8)
    return `${a}${r}${g}${b}`.toUpperCase()
  }

  return undefined
}

export function argbToHex(argb?: string | null): string | undefined {
  if (!argb || typeof argb !== 'string') return undefined
  const clean = argb.trim().replace(/^#/, '')
  if (clean.length === 8) {
    // AARRGGBB -> #RRGGBB (舍弃 Alpha 简化为主流 16 进制颜色)
    return `#${clean.slice(2).toLowerCase()}`
  }
  if (clean.length === 6) {
    return `#${clean.toLowerCase()}`
  }
  return undefined
}

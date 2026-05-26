export type Platform = 'mac' | 'windows' | 'linux' | 'unknown'

/** 表格工具栏 / 右键菜单常用快捷键（展示用，与 SheetCanvas 键盘逻辑对齐） */
export const SHORTCUTS = {
  copy: { mac: '⌘ + C', win: 'Ctrl + C' },
  cut: { mac: '⌘ + X', win: 'Ctrl + X' },
  paste: { mac: '⌘ + V', win: 'Ctrl + V' },
  formatPainter: { mac: '⌘ + Shift + C', win: 'Ctrl + Shift + C' },
  clearFormat: { mac: '⌘ + \\', win: 'Ctrl + \\' },
  bold: { mac: '⌘ + B', win: 'Ctrl + B' },
  italic: { mac: '⌘ + I', win: 'Ctrl + I' },
  underline: { mac: '⌘ + U', win: 'Ctrl + U' },
  textColor: { mac: '⌥ + ⌘ + C', win: 'Alt + Ctrl + C' },
  backgroundColor: { mac: '⌥ + ⌘ + H', win: 'Alt + Ctrl + H' },
  undo: { mac: '⌘ + Z', win: 'Ctrl + Z' },
  redo: { mac: 'Shift + ⌘ + Z', win: 'Ctrl + Y' },
  findAndReplace: { mac: '⌘ + F', win: 'Ctrl + F' },
  alignLeft: { mac: '⌘ + Shift + L', win: 'Ctrl + Shift + L' },
  alignCenter: { mac: '⌘ + Shift + E', win: 'Ctrl + Shift + E' },
  alignRight: { mac: '⌘ + Shift + R', win: 'Ctrl + Shift + R' },
  link: { mac: '⌘ + K', win: 'Ctrl + K' },
} as const

export type ShortcutKey = keyof typeof SHORTCUTS

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown'
  const ua = window.navigator.userAgent.toLowerCase()
  if (ua.includes('mac')) return 'mac'
  if (ua.includes('win')) return 'windows'
  if (ua.includes('linux')) return 'linux'
  return 'unknown'
}

/** 当前平台下的快捷键展示文案 */
export function getShortcutTipByKey(key: ShortcutKey): string {
  const map = SHORTCUTS[key]
  if (!map) return ''
  const platform = detectPlatform()
  if (platform === 'mac') return map.mac
  return map.win
}

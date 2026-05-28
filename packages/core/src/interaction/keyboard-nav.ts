export function isPrintableKey(
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey'>,
): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false
  return e.key.length === 1
}

export type KeyboardNavResult =
  | { type: 'move'; r: number; c: number }
  | { type: 'edit'; r: number; c: number }
  | { type: 'clear' }
  | { type: 'tab'; r: number; c: number }
  | { type: 'noop' }

export function resolveKeyboardNav(options: {
  key: string
  r: number
  c: number
  totalRows: number
  totalCols: number
}): KeyboardNavResult {
  const { key, r, c, totalRows, totalCols } = options

  if (key === 'ArrowUp') {
    return { type: 'move', r: Math.max(0, r - 1), c }
  }
  if (key === 'ArrowDown') {
    return { type: 'move', r: Math.min(totalRows - 1, r + 1), c }
  }
  if (key === 'ArrowLeft') {
    return { type: 'move', r, c: Math.max(0, c - 1) }
  }
  if (key === 'ArrowRight') {
    return { type: 'move', r, c: Math.min(totalCols - 1, c + 1) }
  }
  if (key === 'Enter') {
    return { type: 'edit', r, c }
  }
  if (key === 'Delete' || key === 'Backspace') {
    return { type: 'clear' }
  }
  if (key === 'Tab') {
    return { type: 'tab', r, c: Math.min(totalCols - 1, c + 1) }
  }
  return { type: 'noop' }
}

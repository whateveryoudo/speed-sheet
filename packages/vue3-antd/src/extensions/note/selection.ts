import type { Sheet } from '@speed-sheet/core'

function eachCellInSelection(
  sheet: Sheet,
  fn: (r: number, c: number) => void,
): void {
  const sel = sheet.state.getSelection()
  const r0 = Math.min(sel.row[0], sel.row[1])
  const r1 = Math.max(sel.row[0], sel.row[1])
  const c0 = Math.min(sel.column[0], sel.column[1])
  const c1 = Math.max(sel.column[0], sel.column[1])
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      fn(r, c)
    }
  }
}

export function removeNotesInSelection(sheet: Sheet): boolean {
  const targets: Array<{ r: number; c: number }> = []
  eachCellInSelection(sheet, (r, c) => {
    if (sheet.state.getDataVerification(r, c)?.type === 'note') {
      targets.push({ r, c })
    }
  })
  if (!targets.length) return false
  const chain = sheet.chain()
  for (const { r, c } of targets) {
    chain.removeNote({ r, c })
  }
  chain.run()
  return true
}

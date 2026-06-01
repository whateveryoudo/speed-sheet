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

/** 当前选区内是否存在浮动图片 */
export function selectionHasSheetImages(sheet: Sheet): boolean {
  let found = false
  eachCellInSelection(sheet, (r, c) => {
    if (sheet.state.getImagesAtCell(r, c).length > 0) found = true
  })
  return found
}

/** 删除选区内全部浮动图片，返回是否删除了至少一张 */
export function removeSheetImagesInSelection(sheet: Sheet): boolean {
  const ids: string[] = []
  eachCellInSelection(sheet, (r, c) => {
    for (const img of sheet.state.getImagesAtCell(r, c)) {
      ids.push(img.id)
    }
  })
  if (!ids.length) return false
  const chain = sheet.chain()
  for (const id of ids) {
    chain.removeSheetImage({ id })
  }
  chain.run()
  return true
}

import type { SheetState } from './SheetState'

/** 清除单元格内浮动图、附件等富内容（设置下拉/复选框前） */
export function clearCellRichContent(state: SheetState, r: number, c: number): void {
  for (const img of state.getImagesAtCell(r, c)) {
    state.deleteImage(img.id)
  }
  const cell = state.getCellData(r, c)
  if (cell?.att) {
    state.deleteCell(r, c)
  }
}

export function cellHasRichContent(state: SheetState, r: number, c: number): boolean {
  if (state.getImagesAtCell(r, c).length > 0) return true
  return !!state.getCellData(r, c)?.att
}

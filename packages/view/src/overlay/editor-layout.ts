import {
  cellRect,
  CELL_EDITOR_OUTSET,
  buildCellMap,
  getCellTextColSpan,
  computeEditorWidth,
  MergeContext,
  type GridLayout,
  type CellEntry,
} from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'
import type { CssStyle } from '../types'

export type EditorBox = {
  left: number
  top: number
  minW: number
  minH: number
}

let measureCanvas: HTMLCanvasElement | null = null

export function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCanvas) measureCanvas = document.createElement('canvas')
  return measureCanvas.getContext('2d')!
}

export function computeEditorBox(options: {
  editR: number
  editC: number
  layout: GridLayout
  scrollX: number
  scrollY: number
  mergeContext?: MergeContext
}): EditorBox {
  const mc = options.mergeContext ?? MergeContext.empty()
  const r = cellRect(options.editR, options.editC, options.layout, mc)
  const o = CELL_EDITOR_OUTSET
  return {
    left: r.x - options.scrollX - o,
    top: r.y - options.scrollY - o,
    minW: r.w + o * 2,
    minH: r.h + o * 2,
  }
}

export function computeEditorWidthPx(options: {
  editR: number
  editC: number
  editorValue: string
  layout: GridLayout
  scrollX: number
  scrollY: number
  cellEntries: CellEntry[]
  cells: Array<{ r: number; c: number; data: CellAttributes }>
  mergeContext?: MergeContext
}): number {
  const ctx = getMeasureCtx()
  const cell = options.cells.find((x) => x.r === options.editR && x.c === options.editC)
  const data: CellAttributes = cell?.data ?? { v: options.editorValue }
  const cellMap = buildCellMap(options.cellEntries)
  const colSpan = getCellTextColSpan(
    cellMap,
    options.editR,
    options.editC,
    data,
    options.layout,
    ctx,
    options.editorValue,
  )
  const { left } = computeEditorBox({
    editR: options.editR,
    editC: options.editC,
    layout: options.layout,
    scrollX: options.scrollX,
    scrollY: options.scrollY,
    mergeContext: options.mergeContext,
  })
  return computeEditorWidth(
    ctx,
    options.editorValue,
    cell?.data,
    colSpan,
    options.layout,
    left,
  )
}

export function computeEditorStyles(options: {
  box: EditorBox
  viewportW: number
  widthPx: number
}): { editor: CssStyle; field: CssStyle } {
  const { left, top, minW, minH } = options.box
  const maxW = Math.max(minW, options.viewportW - left - 4)
  const width = Math.min(maxW, Math.max(minW, options.widthPx || minW))
  const editor: CssStyle = {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    minWidth: `${minW}px`,
    maxWidth: `${maxW}px`,
    height: `${minH}px`,
  }
  const field: CssStyle = {
    width: '100%',
    minWidth: editor.minWidth!,
    maxWidth: editor.maxWidth!,
  }
  return { editor, field }
}

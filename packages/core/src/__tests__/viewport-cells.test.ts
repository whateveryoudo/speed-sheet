import { describe, it, expect } from 'vitest'
import { Sheet } from '../Sheet'
import { expandViewportCellBounds, isCellInViewportBounds } from '../state/viewport-cells'
import { defaultLayout, getVisibleRange } from '../renderer/canvas'

describe('viewport cell bounds', () => {
  it('expandViewportCellBounds pads and includes intersecting merges', () => {
    const expanded = expandViewportCellBounds(
      { rowStart: 5, rowEnd: 10, colStart: 2, colEnd: 4 },
      200,
      30,
      [{ r: 3, c: 1, rs: 4, cs: 3 }],
    )
    expect(expanded.rowStart).toBe(3)
    expect(expanded.rowEnd).toBe(12)
    expect(expanded.colStart).toBe(0)
    expect(expanded.colEnd).toBe(6)
  })

  it('isCellInViewportBounds checks inclusive range', () => {
    const bounds = { rowStart: 2, rowEnd: 4, colStart: 1, colEnd: 3 }
    expect(isCellInViewportBounds(2, 1, bounds)).toBe(true)
    expect(isCellInViewportBounds(1, 1, bounds)).toBe(false)
    expect(isCellInViewportBounds(4, 3, bounds)).toBe(true)
    expect(isCellInViewportBounds(4, 4, bounds)).toBe(false)
  })
})

describe('SheetState.getCellsForViewport', () => {
  it('returns only cells in viewport (+ spillover)', () => {
    const sheet = new Sheet()
    sheet.chain().setCellValue({ r: 0, c: 0, value: 'A' }).run()
    sheet.chain().setCellValue({ r: 50, c: 5, value: 'far' }).run()

    const layout = defaultLayout({ scrollY: 0, scrollX: 0, viewportW: 800, viewportH: 600 })
    const bounds = getVisibleRange(layout)
    const cells = sheet.state.getCellsForViewport(bounds)

    expect(cells.some((c) => c.r === 0 && c.c === 0)).toBe(true)
    expect(cells.some((c) => c.r === 50)).toBe(false)
  })
})

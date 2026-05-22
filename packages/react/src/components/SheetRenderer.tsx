import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  renderSheet,
  cellFromPoint,
  cellRect,
  defaultLayout,
  type GridLayout,
  type CellEntry,
} from '@speed-sheet/core'
import type { Selection, CellAttributes } from '@speed-sheet/shared'
import type { Sheet } from '@speed-sheet/core'

const RHW = 46
const CHH = 20
const CW = 73
const RH = 19
const TOTAL_ROWS = 200
const TOTAL_COLS = 30
const TOTAL_W = RHW + TOTAL_COLS * CW
const TOTAL_H = CHH + TOTAL_ROWS * RH

function colLetter(c: number): string {
  let s = ''
  let n = c
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

export interface SheetRendererProps {
  sheet?: Sheet | null
  selection?: Selection
  cells?: Array<{ r: number; c: number; data: CellAttributes }>
  showToolbar?: boolean
  toolbar?: React.ReactNode
  showSheetBar?: boolean
  sheetNames?: string[]
  activeSheetName?: string
  onCellClick?: (r: number, c: number) => void
  onSwitchSheet?: (name: string) => void
  onAddSheet?: () => void
}

export function SheetRenderer({
  sheet,
  selection = { row: [0, 0], column: [0, 0] },
  cells = [],
  showToolbar = false,
  toolbar,
  showSheetBar = false,
  sheetNames = [],
  activeSheetName = '',
  onCellClick,
  onSwitchSheet,
  onAddSheet,
}: SheetRendererProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef2 = useRef({ x: 0, y: 0 })
  const layoutRef = useRef<GridLayout>(
    defaultLayout({ totalRows: TOTAL_ROWS, totalCols: TOTAL_COLS }),
  )

  const cellEntries = useMemo<CellEntry[]>(
    () => cells.map((c) => ({ r: c.r, c: c.c, data: c.data })),
    [cells],
  )

  const cellRef = `${colLetter(selection.column[0])}${selection.row[0] + 1}`

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const viewport = viewportRef.current
    const scroll = scrollRef.current
    if (!canvas || !viewport || !scroll) return

    const w = viewport.clientWidth
    const h = viewport.clientHeight
    if (w <= 0 || h <= 0) return

    const dpr = window.devicePixelRatio || 1
    const bw = Math.round(w * dpr)
    const bh = Math.round(h * dpr)
    if (canvas.width !== bw) canvas.width = bw
    if (canvas.height !== bh) canvas.height = bh

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const { x: sx, y: sy } = scrollRef2.current
    const nextLayout: GridLayout = {
      ...layoutRef.current,
      viewportW: w,
      viewportH: h,
      scrollX: sx,
      scrollY: sy,
    }
    layoutRef.current = nextLayout
    renderSheet(ctx, { layout: nextLayout, cells: cellEntries, selection })
  }, [cellEntries, selection])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(el)
    draw()
    return () => ro.disconnect()
  }, [draw])

  useEffect(() => {
    draw()
  }, [cells, selection, draw])

  const onScroll = () => {
    scrollRef2.current = {
      x: scrollRef.current?.scrollLeft ?? 0,
      y: scrollRef.current?.scrollTop ?? 0,
    }
    draw()
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const pt = cellFromPoint(e.clientX, e.clientY, rect, layoutRef.current)
    if (pt.r >= 0 && pt.c >= 0) onCellClick?.(pt.r, pt.c)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', minHeight: 0, fontSize: 11 }}>
      <div style={{ height: 28, display: 'flex', alignItems: 'center', borderBottom: '1px solid #d0d0d0', padding: '0 6px', gap: 6, flexShrink: 0 }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 600, padding: '2px 10px', border: '1px solid #e0e0e0', borderRadius: 3, minWidth: 52, textAlign: 'center' }}>{cellRef}</span>
        <span style={{ fontStyle: 'italic', fontWeight: 700, color: '#999' }}>fx</span>
      </div>

      {showToolbar && toolbar && (
        <div style={{ flexShrink: 0, borderBottom: '1px solid #d0d0d0', background: '#fafafa', padding: '2px 6px' }}>{toolbar}</div>
      )}

      <div
        ref={viewportRef}
        style={{ flex: '1 1 0', minHeight: 0, minWidth: 0, position: 'relative', overflow: 'hidden', background: '#fff' }}
      >
        <div
          ref={scrollRef}
          onScroll={onScroll}
          style={{ position: 'absolute', inset: 0, overflow: 'auto' }}
        >
          <div style={{ width: TOTAL_W, height: TOTAL_H, pointerEvents: 'none' }} aria-hidden />
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: 'cell', zIndex: 1 }}
        />
      </div>

      {showSheetBar && (
        <div style={{ height: 31, borderTop: '1px solid #d0d0d0', display: 'flex', alignItems: 'center', padding: '0 4px', background: '#f0f0f0', gap: 1, flexShrink: 0 }}>
          {sheetNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onSwitchSheet?.(name)}
              style={{
                padding: '2px 16px',
                background: name === activeSheetName ? '#fff' : '#e0e0e0',
                border: 'none',
                borderRadius: '4px 4px 0 0',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: name === activeSheetName ? 600 : 400,
              }}
            >
              {name}
            </button>
          ))}
          <button type="button" onClick={onAddSheet} style={{ padding: '2px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
        </div>
      )}
    </div>
  )
}

export { cellRect, colLetter }

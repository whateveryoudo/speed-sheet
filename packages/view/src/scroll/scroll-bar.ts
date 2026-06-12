import type { SheetScrollbarUi } from '../types'
import { Subscribable } from '../utils/subscribe'

export const SCROLLBAR_SIZE = 12
const MIN_THUMB_PX = 24
const SCROLLBAR_HIDE_DELAY_MS = 1000
/** 行模式滚轮每档像素（浏览器 deltaMode=1 时） */
const WHEEL_LINE_PX = 40
const DEFAULT_RHW = 46
const DEFAULT_CHH = 25

export type ScrollBarOptions = {
  getScrollEl: () => HTMLElement | undefined
  getViewportEl: () => HTMLElement | undefined
  getRowHeaderWidth: () => number | undefined
  getColumnHeaderHeight: () => number | undefined
  onScroll: () => void
}

export class ScrollBarController extends Subscribable {
  scrollLeft = 0
  scrollTop = 0
  scrollWidth = 0
  scrollHeight = 0
  clientWidth = 0
  clientHeight = 0

  barsRevealed = false
  gutterXHovered = false
  gutterYHovered = false
  scrollbarHovered = false

  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private dragAxis: 'x' | 'y' | null = null
  private dragStart = 0
  private scrollStart = 0
  private scrollObs: ResizeObserver | null = null

  constructor(private readonly options: ScrollBarOptions) {
    super()
  }

  get scrollbarVisibleX(): boolean {
    return (
      this.barsRevealed ||
      this.gutterXHovered ||
      this.scrollbarHovered ||
      this.dragAxis === 'x'
    )
  }

  get scrollbarVisibleY(): boolean {
    return (
      this.barsRevealed ||
      this.gutterYHovered ||
      this.scrollbarHovered ||
      this.dragAxis === 'y'
    )
  }

  computeScrollbar(): SheetScrollbarUi {
    const rhw = this.options.getRowHeaderWidth() ?? DEFAULT_RHW
    const chh = this.options.getColumnHeaderHeight() ?? DEFAULT_CHH

    const maxLeft = Math.max(0, this.scrollWidth - this.clientWidth)
    const maxTop = Math.max(0, this.scrollHeight - this.clientHeight)
    const canScrollX = maxLeft > 1
    const canScrollY = maxTop > 1

    const trackW = Math.max(0, this.clientWidth - rhw - (canScrollY ? SCROLLBAR_SIZE : 0))
    const trackH = Math.max(0, this.clientHeight - chh - (canScrollX ? SCROLLBAR_SIZE : 0))
    const contentClientW = Math.max(0, this.clientWidth - rhw)
    const contentClientH = Math.max(0, this.clientHeight - chh)

    let thumbW = trackW
    if (canScrollX && this.scrollWidth > 0) {
      thumbW = Math.max(MIN_THUMB_PX, (contentClientW / this.scrollWidth) * trackW)
    }
    let thumbH = trackH
    if (canScrollY && this.scrollHeight > 0) {
      thumbH = Math.max(MIN_THUMB_PX, (contentClientH / this.scrollHeight) * trackH)
    }

    const thumbLeft = maxLeft > 0 ? (this.scrollLeft / maxLeft) * (trackW - thumbW) : 0
    const thumbTop = maxTop > 0 ? (this.scrollTop / maxTop) * (trackH - thumbH) : 0

    const gutterXStyle = {
      left: `${rhw}px`,
      right: canScrollY ? `${SCROLLBAR_SIZE}px` : '0',
      bottom: '0',
      height: `${SCROLLBAR_SIZE}px`,
    }
    const gutterYStyle = {
      top: `${chh}px`,
      right: '0',
      bottom: canScrollX ? `${SCROLLBAR_SIZE}px` : '0',
      width: `${SCROLLBAR_SIZE}px`,
    }

    return {
      canScrollX,
      canScrollY,
      gutterXStyle,
      gutterYStyle,
      trackXStyle: gutterXStyle,
      trackYStyle: gutterYStyle,
      thumbXStyle: {
        width: `${thumbW}px`,
        height: `${SCROLLBAR_SIZE - 4}px`,
        left: `${thumbLeft}px`,
        top: '2px',
      },
      thumbYStyle: {
        height: `${thumbH}px`,
        width: `${SCROLLBAR_SIZE - 4}px`,
        top: `${thumbTop}px`,
        left: '2px',
      },
    }
  }

  private clearHideTimer(): void {
    if (this.hideTimer != null) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
  }

  private scheduleHide(): void {
    this.clearHideTimer()
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null
      if (
        !this.gutterXHovered &&
        !this.gutterYHovered &&
        !this.scrollbarHovered &&
        this.dragAxis == null
      ) {
        this.barsRevealed = false
        this.notify()
      }
    }, SCROLLBAR_HIDE_DELAY_MS)
  }

  private revealBars(): void {
    this.barsRevealed = true
    this.notify()
    this.scheduleHide()
  }

  syncScrollMetrics(): void {
    const el = this.options.getScrollEl()
    if (!el) return
    this.scrollLeft = el.scrollLeft
    this.scrollTop = el.scrollTop
    this.scrollWidth = el.scrollWidth
    this.scrollHeight = el.scrollHeight
    this.clientWidth = el.clientWidth
    this.clientHeight = el.clientHeight
    this.notify()
  }

  handleScroll(): void {
    this.syncScrollMetrics()
    this.revealBars()
    this.options.onScroll()
  }

  onGutterXEnter(): void {
    this.gutterXHovered = true
    this.clearHideTimer()
    this.notify()
  }

  onGutterXLeave(): void {
    this.gutterXHovered = false
    this.scheduleHide()
    this.notify()
  }

  onGutterYEnter(): void {
    this.gutterYHovered = true
    this.clearHideTimer()
    this.notify()
  }

  onGutterYLeave(): void {
    this.gutterYHovered = false
    this.scheduleHide()
    this.notify()
  }

  onScrollbarEnter(): void {
    this.scrollbarHovered = true
    this.clearHideTimer()
    this.notify()
  }

  onScrollbarLeave(): void {
    this.scrollbarHovered = false
    this.scheduleHide()
    this.notify()
  }

  onCanvasWheel(e: WheelEvent): void {
    const scroll = this.options.getScrollEl()
    if (!scroll) return

    let dx = e.deltaX
    let dy = e.deltaY
    if (e.deltaMode === 1) {
      dx *= WHEEL_LINE_PX
      dy *= WHEEL_LINE_PX
    } else if (e.deltaMode === 2) {
      dx *= scroll.clientWidth
      dy *= scroll.clientHeight
    }
    if (e.shiftKey && dx === 0) {
      dx = dy
      dy = 0
    }

    const maxLeft = scroll.scrollWidth - scroll.clientWidth
    const maxTop = scroll.scrollHeight - scroll.clientHeight
    if (maxLeft <= 0 && maxTop <= 0) return

    const nextLeft = Math.max(0, Math.min(maxLeft, scroll.scrollLeft + dx))
    const nextTop = Math.max(0, Math.min(maxTop, scroll.scrollTop + dy))
    if (nextLeft === scroll.scrollLeft && nextTop === scroll.scrollTop) return

    e.preventDefault()
    scroll.scrollLeft = nextLeft
    scroll.scrollTop = nextTop
    this.handleScroll()
  }

  scrollTo(axis: 'x' | 'y', offset: number): void {
    const scroll = this.options.getScrollEl()
    if (!scroll) return
    if (axis === 'x') scroll.scrollLeft = offset
    else scroll.scrollTop = offset
    this.handleScroll()
  }

  onThumbDragStart(axis: 'x' | 'y', e: MouseEvent): void {
    e.preventDefault()
    const scroll = this.options.getScrollEl()
    if (!scroll) return
    this.dragAxis = axis
    this.dragStart = axis === 'x' ? e.clientX : e.clientY
    this.scrollStart = axis === 'x' ? scroll.scrollLeft : scroll.scrollTop
    this.revealBars()
    this.clearHideTimer()
    this.notify()

    const onMove = (ev: MouseEvent) => {
      if (!this.dragAxis) return
      const el = this.options.getScrollEl()
      if (!el) return
      const sb = this.computeScrollbar()
      if (this.dragAxis === 'x') {
        const rhw = this.options.getRowHeaderWidth() ?? DEFAULT_RHW
        const trackW = this.clientWidth - rhw - (sb.canScrollY ? SCROLLBAR_SIZE : 0)
        const thumbW = parseFloat(String(sb.thumbXStyle.width)) || MIN_THUMB_PX
        const maxLeft = el.scrollWidth - el.clientWidth
        const travel = Math.max(1, trackW - thumbW)
        const delta = ev.clientX - this.dragStart
        el.scrollLeft = Math.max(0, Math.min(maxLeft, this.scrollStart + (delta / travel) * maxLeft))
      } else {
        const chh = this.options.getColumnHeaderHeight() ?? DEFAULT_CHH
        const trackH = this.clientHeight - chh - (sb.canScrollX ? SCROLLBAR_SIZE : 0)
        const thumbH = parseFloat(String(sb.thumbYStyle.height)) || MIN_THUMB_PX
        const maxTop = el.scrollHeight - el.clientHeight
        const travel = Math.max(1, trackH - thumbH)
        const delta = ev.clientY - this.dragStart
        el.scrollTop = Math.max(0, Math.min(maxTop, this.scrollStart + (delta / travel) * maxTop))
      }
      this.syncScrollMetrics()
      this.options.onScroll()
    }

    const onUp = () => {
      this.dragAxis = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      this.scheduleHide()
      this.notify()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  onTrackClick(axis: 'x' | 'y', e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('sheet-scrollbar-thumb')) return
    const scroll = this.options.getScrollEl()
    if (!scroll) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const sb = this.computeScrollbar()
    if (axis === 'x') {
      const thumbW = parseFloat(String(sb.thumbXStyle.width)) || MIN_THUMB_PX
      const page = Math.max(scroll.clientWidth - thumbW, 80)
      const clickX = e.clientX - rect.left
      const thumbLeft = parseFloat(String(sb.thumbXStyle.left)) || 0
      this.scrollTo(
        'x',
        Math.max(
          0,
          Math.min(
            scroll.scrollWidth - scroll.clientWidth,
            scroll.scrollLeft + (clickX > thumbLeft + thumbW / 2 ? page : -page),
          ),
        ),
      )
    } else {
      const thumbH = parseFloat(String(sb.thumbYStyle.height)) || MIN_THUMB_PX
      const page = Math.max(scroll.clientHeight - thumbH, 80)
      const clickY = e.clientY - rect.top
      const thumbTop = parseFloat(String(sb.thumbYStyle.top)) || 0
      this.scrollTo(
        'y',
        Math.max(
          0,
          Math.min(
            scroll.scrollHeight - scroll.clientHeight,
            scroll.scrollTop + (clickY > thumbTop + thumbH / 2 ? page : -page),
          ),
        ),
      )
    }
  }

  attach(): void {
    const scroll = this.options.getScrollEl()
    const viewport = this.options.getViewportEl()
    if (scroll) {
      this.syncScrollMetrics()
      this.scrollObs = new ResizeObserver(() => this.syncScrollMetrics())
      this.scrollObs.observe(scroll)
      if (viewport) this.scrollObs.observe(viewport)
    }
  }

  detach(): void {
    this.scrollObs?.disconnect()
    this.clearHideTimer()
  }
}

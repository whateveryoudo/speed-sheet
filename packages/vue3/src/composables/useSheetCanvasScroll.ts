import { ref, computed, onMounted, onUnmounted, type Ref, type CSSProperties } from 'vue'

const SCROLLBAR_SIZE = 12
const MIN_THUMB_PX = 24
/** 停止滚动后多久隐藏滚动条（语雀风格） */
const SCROLLBAR_HIDE_DELAY_MS = 1000

export type SheetScrollbarUi = {
  canScrollX: boolean
  canScrollY: boolean
  gutterXStyle: CSSProperties
  gutterYStyle: CSSProperties
  trackXStyle: CSSProperties
  trackYStyle: CSSProperties
  thumbXStyle: CSSProperties
  thumbYStyle: CSSProperties
}

const DEFAULT_RHW = 46
const DEFAULT_CHH = 25

/** 隐藏原生滚动条；语雀式显隐：滚动时显示，或鼠标进入底/右侧滚动热区 */
export function useSheetCanvasScroll(options: {
  scrollEl: Ref<HTMLElement | undefined>
  viewportEl: Ref<HTMLElement | undefined>
  rowHeaderWidth: Ref<number | undefined>
  columnHeaderHeight: Ref<number | undefined>
  onScroll: () => void
}) {
  const scrollLeft = ref(0)
  const scrollTop = ref(0)
  const scrollWidth = ref(0)
  const scrollHeight = ref(0)
  const clientWidth = ref(0)
  const clientHeight = ref(0)

  /** 由滚轮/拖拽滚动触发，横竖条一起显示 */
  const barsRevealed = ref(false)
  const gutterXHovered = ref(false)
  const gutterYHovered = ref(false)
  const scrollbarHovered = ref(false)

  let hideTimer: ReturnType<typeof setTimeout> | null = null
  let dragAxis: 'x' | 'y' | null = null
  let dragStart = 0
  let scrollStart = 0

  function clearHideTimer(): void {
    if (hideTimer != null) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  function scheduleHide(): void {
    clearHideTimer()
    hideTimer = setTimeout(() => {
      hideTimer = null
      if (
        !gutterXHovered.value &&
        !gutterYHovered.value &&
        !scrollbarHovered.value &&
        dragAxis == null
      ) {
        barsRevealed.value = false
      }
    }, SCROLLBAR_HIDE_DELAY_MS)
  }

  function revealBars(): void {
    barsRevealed.value = true
    scheduleHide()
  }

  const scrollbarVisibleX = computed(
    () =>
      barsRevealed.value ||
      gutterXHovered.value ||
      scrollbarHovered.value ||
      dragAxis === 'x',
  )

  const scrollbarVisibleY = computed(
    () =>
      barsRevealed.value ||
      gutterYHovered.value ||
      scrollbarHovered.value ||
      dragAxis === 'y',
  )

  function syncScrollMetrics(): void {
    const el = options.scrollEl.value
    if (!el) return
    scrollLeft.value = el.scrollLeft
    scrollTop.value = el.scrollTop
    scrollWidth.value = el.scrollWidth
    scrollHeight.value = el.scrollHeight
    clientWidth.value = el.clientWidth
    clientHeight.value = el.clientHeight
  }

  const scrollbar = computed((): SheetScrollbarUi => {
    const rhw = options.rowHeaderWidth.value ?? DEFAULT_RHW
    const chh = options.columnHeaderHeight.value ?? DEFAULT_CHH

    const maxLeft = Math.max(0, scrollWidth.value - clientWidth.value)
    const maxTop = Math.max(0, scrollHeight.value - clientHeight.value)
    const canScrollX = maxLeft > 1
    const canScrollY = maxTop > 1

    const trackW = Math.max(
      0,
      clientWidth.value - rhw - (canScrollY ? SCROLLBAR_SIZE : 0),
    )
    const trackH = Math.max(
      0,
      clientHeight.value - chh - (canScrollX ? SCROLLBAR_SIZE : 0),
    )
    const contentClientW = Math.max(0, clientWidth.value - rhw)
    const contentClientH = Math.max(0, clientHeight.value - chh)

    let thumbW = trackW
    if (canScrollX && scrollWidth.value > 0) {
      thumbW = Math.max(MIN_THUMB_PX, (contentClientW / scrollWidth.value) * trackW)
    }
    let thumbH = trackH
    if (canScrollY && scrollHeight.value > 0) {
      thumbH = Math.max(MIN_THUMB_PX, (contentClientH / scrollHeight.value) * trackH)
    }

    const thumbLeft =
      maxLeft > 0 ? ((scrollLeft.value / maxLeft) * (trackW - thumbW)) : 0
    const thumbTop =
      maxTop > 0 ? ((scrollTop.value / maxTop) * (trackH - thumbH)) : 0

    const gutterXStyle: CSSProperties = {
      left: `${rhw}px`,
      right: canScrollY ? `${SCROLLBAR_SIZE}px` : '0',
      bottom: '0',
      height: `${SCROLLBAR_SIZE}px`,
    }
    const gutterYStyle: CSSProperties = {
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
  })

  function handleScroll(): void {
    syncScrollMetrics()
    revealBars()
    options.onScroll()
  }

  function onGutterXEnter(): void {
    gutterXHovered.value = true
    clearHideTimer()
  }

  function onGutterXLeave(): void {
    gutterXHovered.value = false
    scheduleHide()
  }

  function onGutterYEnter(): void {
    gutterYHovered.value = true
    clearHideTimer()
  }

  function onGutterYLeave(): void {
    gutterYHovered.value = false
    scheduleHide()
  }

  function onScrollbarEnter(): void {
    scrollbarHovered.value = true
    clearHideTimer()
  }

  function onScrollbarLeave(): void {
    scrollbarHovered.value = false
    scheduleHide()
  }

  function onCanvasWheel(e: WheelEvent): void {
    const scroll = options.scrollEl.value
    if (!scroll) return

    let dx = e.deltaX
    let dy = e.deltaY
    if (e.deltaMode === 1) {
      dx *= 16
      dy *= 16
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
    handleScroll()
  }

  function scrollTo(axis: 'x' | 'y', offset: number): void {
    const scroll = options.scrollEl.value
    if (!scroll) return
    if (axis === 'x') scroll.scrollLeft = offset
    else scroll.scrollTop = offset
    handleScroll()
  }

  function onThumbDragStart(axis: 'x' | 'y', e: MouseEvent): void {
    e.preventDefault()
    const scroll = options.scrollEl.value
    if (!scroll) return
    dragAxis = axis
    dragStart = axis === 'x' ? e.clientX : e.clientY
    scrollStart = axis === 'x' ? scroll.scrollLeft : scroll.scrollTop
    revealBars()
    clearHideTimer()

    const onMove = (ev: MouseEvent) => {
      if (!dragAxis) return
      const el = options.scrollEl.value
      if (!el) return
      const sb = scrollbar.value
      if (dragAxis === 'x') {
        const rhw = options.rowHeaderWidth.value ?? DEFAULT_RHW
        const trackW =
          clientWidth.value - rhw - (sb.canScrollY ? SCROLLBAR_SIZE : 0)
        const thumbW = parseFloat(String(sb.thumbXStyle.width)) || MIN_THUMB_PX
        const maxLeft = el.scrollWidth - el.clientWidth
        const travel = Math.max(1, trackW - thumbW)
        const delta = ev.clientX - dragStart
        el.scrollLeft = Math.max(
          0,
          Math.min(maxLeft, scrollStart + (delta / travel) * maxLeft),
        )
      } else {
        const chh = options.columnHeaderHeight.value ?? DEFAULT_CHH
        const trackH =
          clientHeight.value - chh - (sb.canScrollX ? SCROLLBAR_SIZE : 0)
        const thumbH = parseFloat(String(sb.thumbYStyle.height)) || MIN_THUMB_PX
        const maxTop = el.scrollHeight - el.clientHeight
        const travel = Math.max(1, trackH - thumbH)
        const delta = ev.clientY - dragStart
        el.scrollTop = Math.max(
          0,
          Math.min(maxTop, scrollStart + (delta / travel) * maxTop),
        )
      }
      syncScrollMetrics()
      options.onScroll()
    }

    const onUp = () => {
      dragAxis = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      scheduleHide()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  function onTrackClick(axis: 'x' | 'y', e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('sheet-scrollbar-thumb')) return
    const scroll = options.scrollEl.value
    if (!scroll) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const sb = scrollbar.value
    if (axis === 'x') {
      const thumbW = parseFloat(String(sb.thumbXStyle.width)) || MIN_THUMB_PX
      const page = Math.max(scroll.clientWidth - thumbW, 80)
      const clickX = e.clientX - rect.left
      const thumbLeft = parseFloat(String(sb.thumbXStyle.left)) || 0
      scrollTo(
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
      scrollTo(
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

  let scrollObs: ResizeObserver | null = null

  onMounted(() => {
    const scroll = options.scrollEl.value
    const viewport = options.viewportEl.value
    if (scroll) {
      syncScrollMetrics()
      scrollObs = new ResizeObserver(() => syncScrollMetrics())
      scrollObs.observe(scroll)
      if (viewport) scrollObs.observe(viewport)
    }
  })

  onUnmounted(() => {
    scrollObs?.disconnect()
    clearHideTimer()
  })

  return {
    scrollbar,
    scrollbarVisibleX,
    scrollbarVisibleY,
    SCROLLBAR_SIZE,
    syncScrollMetrics,
    onCanvasWheel,
    handleScroll,
    onThumbDragStart,
    onTrackClick,
    onGutterXEnter,
    onGutterXLeave,
    onGutterYEnter,
    onGutterYLeave,
    onScrollbarEnter,
    onScrollbarLeave,
  }
}

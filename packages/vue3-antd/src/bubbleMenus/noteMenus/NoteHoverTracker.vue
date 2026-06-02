<script setup lang="ts">
import { onMounted, onUnmounted, type Ref } from 'vue'
import { cellPointFromMouse, MergeContext, buildSheetGridMetrics } from '@speed-sheet/core'
import { noteHasContent } from '@speed-sheet/shared'
import { useSheetViewport } from '@speed-sheet/vue3'
import { useNoteConfigPanel } from '../../composables/useNoteConfigPanel'

const props = defineProps<{
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()

const { sheet, revision, layout, scrollX, scrollY, viewportTick } = useSheetViewport()
const { open, anchor, openPanel, scheduleClose, cancelScheduledClose, editing } =
  useNoteConfigPanel()

function resolveBoundary(): HTMLElement | null {
  const b = props.boundary
  if (!b) return null
  if (typeof b === 'object' && b !== null && 'value' in b) {
    return (b as Ref<HTMLElement | null | undefined>).value ?? null
  }
  return b as HTMLElement
}

function isPointerOverNotePanel(e: MouseEvent): boolean {
  const boundary = resolveBoundary()
  if (!boundary) return false
  const target = e.target as Node | null
  if (!target) return false
  const panel = boundary.querySelector('.sheet-note-panel')
  const bubble = boundary.querySelector('.sheet-bubble-menu-host')
  return !!(panel?.contains(target) || bubble?.contains(target))
}

function layoutForHit() {
  const L = layout.value
  const s = sheet.value
  return {
    ...L,
    scrollX: scrollX.value,
    scrollY: scrollY.value,
    metrics: s ? buildSheetGridMetrics(s, L) : L.metrics,
  }
}

function openNoteAt(r: number, c: number): void {
  cancelScheduledClose()
  openPanel({ r, c })
  viewportTick.value++
}

function onPointerMove(e: MouseEvent): void {
  if (isPointerOverNotePanel(e)) {
    cancelScheduledClose()
    return
  }
  if (editing.value) return

  void revision.value
  const boundary = resolveBoundary()
  const s = sheet.value
  const canvas = boundary?.querySelector('canvas.sheet-canvas') as HTMLCanvasElement | null
  if (!boundary || !s || !canvas) {
    scheduleClose()
    return
  }

  const rect = canvas.getBoundingClientRect()
  const L = layoutForHit()
  const metrics = L.metrics
  if (!metrics) {
    scheduleClose()
    return
  }

  const pt = cellPointFromMouse(e, rect, L, metrics, MergeContext.empty())
  if (!pt) {
    scheduleClose()
    return
  }

  const rule = s.state.getDataVerification(pt.r, pt.c)
  if (rule?.type === 'note' && noteHasContent(rule.noteContent)) {
    if (!open.value || anchor.r !== pt.r || anchor.c !== pt.c) {
      openNoteAt(pt.r, pt.c)
    } else {
      cancelScheduledClose()
    }
    return
  }

  scheduleClose()
}

function onBoundaryLeave(): void {
  if (editing.value) return
  scheduleClose()
}

onMounted(() => {
  const boundary = resolveBoundary()
  if (!boundary) return
  boundary.addEventListener('mousemove', onPointerMove)
  boundary.addEventListener('mouseleave', onBoundaryLeave)
})

onUnmounted(() => {
  cancelScheduledClose()
  const boundary = resolveBoundary()
  if (!boundary) return
  boundary.removeEventListener('mousemove', onPointerMove)
  boundary.removeEventListener('mouseleave', onBoundaryLeave)
})
</script>

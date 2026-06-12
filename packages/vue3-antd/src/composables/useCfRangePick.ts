import { computed, onUnmounted, ref, watch, type Ref } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import { formatRangeA1, parseRangeA1 } from '@speed-sheet/extension-conditional-format'

export function useCfRangePick(sheet: Ref<Sheet | null>) {
  const active = ref(false)
  const pending = ref<{ row: [number, number]; column: [number, number] } | null>(null)
  let onConfirm: ((a1: string) => void) | null = null

  const overlayRange = computed(() => pending.value)

  function onWindowKeyDown(e: KeyboardEvent): void {
    if (!active.value) return
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelPick()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmPick()
    }
  }

  watch(active, (v) => {
    if (v) window.addEventListener('keydown', onWindowKeyDown)
    else window.removeEventListener('keydown', onWindowKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onWindowKeyDown)
  })

  function startPick(initialA1: string, confirm: (a1: string) => void): void {
    active.value = true
    onConfirm = confirm
    const parsed = parseRangeA1(initialA1)
    if (parsed) {
      pending.value = { row: [...parsed.row], column: [...parsed.column] }
      return
    }
    const sel = sheet.value?.state.getSelection()
    if (sel) {
      pending.value = {
        row: [sel.row[0], sel.row[1]],
        column: [sel.column[0], sel.column[1]],
      }
    }
  }

  function handleSelectRange(
    r0: number,
    c0: number,
    r1: number,
    c1: number,
  ): void {
    if (!active.value) return
    pending.value = {
      row: [Math.min(r0, r1), Math.max(r0, r1)],
      column: [Math.min(c0, c1), Math.max(c0, c1)],
    }
  }

  function confirmPick(): void {
    if (!active.value || !pending.value) return
    const a1 = formatRangeA1(pending.value.row, pending.value.column)
    onConfirm?.(a1)
    cancelPick()
  }

  function cancelPick(): void {
    active.value = false
    pending.value = null
    onConfirm = null
  }

  return {
    active,
    overlayRange,
    startPick,
    handleSelectRange,
    confirmPick,
    cancelPick,
  }
}

<template>
  <div class="sheet-note-panel" @mousedown.stop>
    <a-textarea
      ref="textareaRef"
      v-model:value="content"
      placeholder="输入备注"
      :auto-size="{ minRows: 4, maxRows: 8 }"
      @focus="onFocus"
      @blur="onBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { noteHasContent } from '@speed-sheet/shared'
import type { Sheet } from '@speed-sheet/core'
import { useNoteConfigAutoFocus, useNoteConfigPanel } from '../../composables/useNoteConfigPanel'

const props = defineProps<{
  sheet: Sheet | null
  r: number
  c: number
  applySelection?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  done: []
}>()

const { setEditing } = useNoteConfigPanel()
const autoFocus = useNoteConfigAutoFocus()

const content = ref('')
const hasExisting = ref(false)
const textareaRef = ref<{ focus?: () => void } | null>(null)
const frozenTargets = ref<Array<{ r: number; c: number }>>([])

function captureTargets(): void {
  const s = props.sheet
  if (!s || !props.applySelection) {
    frozenTargets.value = [{ r: props.r, c: props.c }]
    return
  }
  const sel = s.state.getSelection()
  const r0 = Math.min(sel.row[0], sel.row[1])
  const r1 = Math.max(sel.row[0], sel.row[1])
  const c0 = Math.min(sel.column[0], sel.column[1])
  const c1 = Math.max(sel.column[0], sel.column[1])
  const list: Array<{ r: number; c: number }> = []
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      list.push({ r, c })
    }
  }
  frozenTargets.value = list.length ? list : [{ r: props.r, c: props.c }]
}

function loadRule(): void {
  const s = props.sheet
  if (!s) return
  captureTargets()
  const rule = s.state.getDataVerification(props.r, props.c)
  if (rule?.type === 'note') {
    hasExisting.value = true
    content.value = rule.noteContent ?? ''
  } else {
    hasExisting.value = false
    content.value = ''
  }
  if (autoFocus.value) {
    nextTick(() => textareaRef.value?.focus?.())
  }
}

function onFocus(): void {
  setEditing(true)
}

function onBlur(): void {
  setEditing(false)
}

watch(() => [props.sheet, props.r, props.c] as const, loadRule, { immediate: true })

function eachTarget(fn: (r: number, c: number) => void): void {
  for (const { r, c } of frozenTargets.value) {
    fn(r, c)
  }
}

function commit(): void {
  const s = props.sheet
  if (!s) return
  if (!noteHasContent(content.value)) {
    if (hasExisting.value) {
      eachTarget((r, c) => {
        s.chain().removeNote({ r, c }).run()
      })
    }
    emit('cancel')
    return
  }
  eachTarget((r, c) => {
    const rule = s.state.getDataVerification(r, c)
    if (rule?.type === 'note') {
      s.chain().updateNote({ r, c, content: content.value }).run()
    } else {
      s.chain().insertNote({ r, c, content: content.value }).run()
    }
  })
  hasExisting.value = true
  emit('done')
}

onMounted(() => {
  captureTargets()
})

defineExpose({ commit })
</script>

<style scoped lang="less">
.sheet-note-panel {
  width: 240px;
  padding: 5px 2px;
}
</style>

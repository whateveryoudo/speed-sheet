<template>
  <div class="sheet-link-panel" @mousedown.stop>
    <div class="sheet-link-panel__row">
      <span class="sheet-link-panel__label">文本</span>
      <a-input
        v-model:value="linkText"
        placeholder="显示文本"
        @press-enter="commit"
      />
    </div>
    <div class="sheet-link-panel__row">
      <span class="sheet-link-panel__label">地址</span>
      <a-input
        v-model:value="linkAddress"
        placeholder="https://"
        @press-enter="commit"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Sheet } from '@speed-sheet/core'

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

const linkText = ref('')
const linkAddress = ref('')
const hasExisting = ref(false)
const frozenTargets = ref<Array<{ r: number; c: number }>>([])

function normalizeUrl(raw: string): string {
  const t = raw.trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t}`
}

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
  if (rule?.type === 'link') {
    hasExisting.value = true
    linkAddress.value = rule.linkAddress ?? ''
    const cell = s.state.getCellData(props.r, props.c)
    linkText.value = cell?.m ?? cell?.v?.toString() ?? ''
  } else {
    hasExisting.value = false
    linkAddress.value = ''
    const cell = s.state.getCellData(props.r, props.c)
    linkText.value = cell?.m ?? cell?.v?.toString() ?? ''
  }
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
  const address = normalizeUrl(linkAddress.value)
  if (!address) {
    if (hasExisting.value) {
      eachTarget((r, c) => {
        s.chain().removeLink({ r, c }).run()
      })
    }
    emit('cancel')
    return
  }
  const text = linkText.value.trim() || address
  eachTarget((r, c) => {
    const rule = s.state.getDataVerification(r, c)
    if (rule?.type === 'link') {
      s.chain().updateLink({ r, c, linkAddress: address, linkText: text }).run()
    } else {
      s.chain().insertLink({ r, c, linkAddress: address, linkText: text }).run()
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
.sheet-link-panel {
  width: 280px;
  padding: var(--ant-size-sm, 12px);
}

.sheet-link-panel__row {
  display: flex;
  align-items: center;
  gap: var(--ant-size-xs, 8px);
  &:not(:last-child) {
    margin-bottom: var(--ant-size-xs, 8px);
  }
}

.sheet-link-panel__label {
  flex-shrink: 0;
  width: 40px;
  color: var(--ant-color-text-secondary);
  font-size: var(--ant-font-size);
}
</style>

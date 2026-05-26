<template>
  <div
    class="formula-rich-input"
    :class="[inputClass, attrs.class]"
    :style="attrs.style as Record<string, string> | undefined"
  >
    <pre
      ref="mirrorRef"
      class="formula-rich-input__mirror"
      aria-hidden="true"
      v-html="coloredHtml"
    />
    <input
      ref="inputRef"
      class="formula-rich-input__field"
      :value="modelValue"
      :style="fieldStyle"
      spellcheck="false"
      @input="onInput"
      @scroll="syncScroll"
      @focus="emit('focus', $event)"
      @blur="emit('blur', $event)"
      @keydown="emit('keydown', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useAttrs, watch } from 'vue'
import { getFormulaRefSpans, isFormulaText } from '@speed-sheet/extension-formula'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    modelValue: string
    inputClass?: string
    fieldStyle?: Record<string, string>
  }>(),
  {
    inputClass: '',
    fieldStyle: () => ({}),
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  input: []
  focus: [e: FocusEvent]
  blur: [e: FocusEvent]
  keydown: [e: KeyboardEvent]
}>()

const attrs = useAttrs()
const mirrorRef = ref<HTMLPreElement>()
const inputRef = ref<HTMLInputElement>()

defineExpose({
  focus: () => inputRef.value?.focus(),
  setSelectionRange: (start: number, end: number) =>
    inputRef.value?.setSelectionRange(start, end),
  get selectionStart() {
    return inputRef.value?.selectionStart ?? 0
  },
})

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const coloredHtml = computed(() => {
  const text = props.modelValue
  if (!isFormulaText(text)) return escapeHtml(text)
  const spans = getFormulaRefSpans(text)
  if (!spans.length) return escapeHtml(text)
  let html = ''
  let pos = 0
  for (const s of spans) {
    html += escapeHtml(text.slice(pos, s.start))
    html += `<span style="color:${s.color}">${escapeHtml(text.slice(s.start, s.end))}</span>`
    pos = s.end
  }
  html += escapeHtml(text.slice(pos))
  return html
})

function syncScroll(): void {
  const input = inputRef.value
  const mirror = mirrorRef.value
  if (!input || !mirror) return
  mirror.scrollLeft = input.scrollLeft
}

function onInput(e: Event): void {
  const v = (e.target as HTMLInputElement).value
  emit('update:modelValue', v)
  emit('input')
  nextTick(syncScroll)
}

watch(
  () => props.modelValue,
  () => nextTick(syncScroll),
)
</script>

<style scoped>
.formula-rich-input {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.formula-rich-input__mirror,
.formula-rich-input__field {
  margin: 0;
  padding: 0 4px;
  border: none;
  font: inherit;
  font-size: inherit;
  line-height: calc(1em + 2px);
  height: calc(1em + 2px);
  white-space: pre;
  box-sizing: border-box;
}

.formula-rich-input__mirror {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  overflow: hidden;
  pointer-events: none;
  color: #333;
}

.formula-rich-input__field {
  position: relative;
  width: 100%;
  background: transparent;
  color: transparent;
  caret-color: #1a1a1a;
  outline: none;
}
</style>

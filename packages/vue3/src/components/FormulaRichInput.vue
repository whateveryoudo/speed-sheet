<template>
  <div
    class="formula-rich-input"
    :class="[inputClass, attrs.class]"
    :style="attrs.style as Record<string, string> | undefined"
    @click="focus"
  >
    <div
      ref="editorRef"
      class="formula-rich-input__editor"
      :style="fieldStyle"
      contenteditable="true"
      spellcheck="false"
      role="textbox"
      tabindex="0"
      @input="onInput"
      @keydown="onKeydown"
      @keyup="syncCaret"
      @click.stop="syncCaret"
      @focus="onFocus"
      @blur="onBlur"
      @compositionstart="isComposing = true"
      @compositionend="onCompositionEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useAttrs, watch } from 'vue'
import { getFormulaRefSpans, isFormulaText } from '@speed-sheet/extension-formula'
import { getCaretCharacterOffset, setCaretCharacterOffset } from './formulaCaret'

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
  'caret-change': [caret: number]
}>()

const attrs = useAttrs()
const editorRef = ref<HTMLDivElement>()
const isComposing = ref(false)
let currentText = props.modelValue

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 生成语法高亮 HTML（对齐语雀 / Luckysheet 彩色 span） */
function renderFormulaHtml(text: string): string {
  if (!text) return ''
  if (!isFormulaText(text)) return escapeHtml(text)

  const spans = getFormulaRefSpans(text)
  if (!spans.length) {
    return escapeHtml(text)
  }

  let html = ''
  let pos = 0
  for (const s of spans) {
    html += escapeHtml(text.slice(pos, s.start))
    html += `<span class="formula-token-ref" style="color:${s.color}; font-weight:600;">${escapeHtml(
      text.slice(s.start, s.end),
    )}</span>`
    pos = s.end
  }
  html += escapeHtml(text.slice(pos))
  return html
}

function formatHtml(text: string): string {
  let html = renderFormulaHtml(text)
  if (text.endsWith('\n')) {
    html += '<br>'
  }
  return html
}

function updateEditorContent(text: string, preserveCaret = false): void {
  const el = editorRef.value
  if (!el) return

  const oldCaret = preserveCaret ? getCaretCharacterOffset(el) : 0
  currentText = text
  el.innerHTML = formatHtml(text)

  if (preserveCaret) {
    setCaretCharacterOffset(el, oldCaret)
  }
}

function syncCaret(): void {
  const el = editorRef.value
  if (!el) return
  const pos = getCaretCharacterOffset(el)
  emit('caret-change', pos)
}

function onInput(): void {
  if (isComposing.value) return
  const el = editorRef.value
  if (!el) return

  let val = el.innerText ?? el.textContent ?? ''
  val = val.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  currentText = val
  emit('update:modelValue', val)
  emit('input')
  syncCaret()
}

function onCompositionEnd(): void {
  isComposing.value = false
  onInput()
  // 输入法输入完成后，若为公式，做一次高亮同步并保持光标
  const el = editorRef.value
  if (el && isFormulaText(currentText)) {
    updateEditorContent(currentText, true)
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    if (e.altKey) {
      e.preventDefault()
      e.stopPropagation()
      insertText('\n')
      return
    }
    e.preventDefault()
  }
  emit('keydown', e)
}

function onFocus(e: FocusEvent): void {
  emit('focus', e)
  syncCaret()
}

function onBlur(e: FocusEvent): void {
  emit('blur', e)
  // 失焦时格式化彩色 span
  const el = editorRef.value
  if (el) {
    el.innerHTML = renderFormulaHtml(currentText)
  }
}

/** 外部插入/补全文本（例如自动补全函数名） */
function insertText(textToInsert: string, replaceRange?: [number, number]): void {
  const el = editorRef.value
  if (!el) return

  let val = currentText
  let newCaret = 0

  if (replaceRange) {
    const [start, end] = replaceRange
    val = val.slice(0, start) + textToInsert + val.slice(end)
    newCaret = start + textToInsert.length
  } else {
    const caret = getCaretCharacterOffset(el)
    val = val.slice(0, caret) + textToInsert + val.slice(caret)
    newCaret = caret + textToInsert.length
  }

  currentText = val
  el.innerHTML = formatHtml(val)
  setCaretCharacterOffset(el, newCaret)
  emit('update:modelValue', val)
  emit('input')
  emit('caret-change', newCaret)
}

function focus(): void {
  const el = editorRef.value
  if (!el) return
  el.focus()
  syncCaret()
}

function setSelectionRange(start: number, end: number): void {
  const el = editorRef.value
  if (!el) return
  setCaretCharacterOffset(el, end)
  syncCaret()
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal !== currentText) {
      currentText = newVal
      const el = editorRef.value
      if (!el) return
      // 如果当前聚焦中，尽量保持当前光标
      const isFocused = document.activeElement === el
      updateEditorContent(newVal, isFocused)
    }
  },
)

onMounted(() => {
  updateEditorContent(props.modelValue, false)
})

defineExpose({
  focus,
  setSelectionRange,
  insertText,
  get selectionStart() {
    return editorRef.value ? getCaretCharacterOffset(editorRef.value) : 0
  },
})
</script>

<style scoped>
.formula-rich-input {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  min-height: inherit;
  cursor: text;
  background: inherit;
}

.formula-rich-input__editor {
  width: 100%;
  min-height: 1em;
  margin: 0;
  padding: 0 4px;
  border: none;
  outline: none;
  font: inherit;
  font-size: inherit;
  font-family: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  word-break: break-all;
  box-sizing: border-box;
  color: #1f1f1f;
  caret-color: #1677ff;
}

/* 隐藏滚动条保持整洁 */
.formula-rich-input__editor::-webkit-scrollbar {
  display: none;
}

:deep(.formula-token-ref) {
  border-radius: 2px;
  padding: 0 1px;
}
</style>

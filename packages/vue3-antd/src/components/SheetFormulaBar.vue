<script setup lang="ts">
import { computed, nextTick, ref, toRef, watch } from 'vue'
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue'
import { colToLetter, type Sheet } from '@speed-sheet/core'
import {
  getCellFormulaInitial,
  getFormulaPromptContext,
  type FormulaPromptContext,
  type FormulaBuiltinEntry,
} from '@speed-sheet/extension-formula'
import {
  useSheetSelection,
  useFormulaEditOptional,
  FormulaRichInput,
  FormulaAssistPopup,
} from '@speed-sheet/vue3'

const props = defineProps<{
  sheet: Sheet | null
  revision: number
  /** 点击该区域（画布）时不结束公式编辑 */
  boundary?: HTMLElement | null
}>()

const sheetRef = toRef(() => props.sheet)
const revisionRef = toRef(() => props.revision)
const { activeCell } = useSheetSelection(sheetRef, revisionRef)
const formulaEdit = useFormulaEditOptional()

const richInputRef = ref<InstanceType<typeof FormulaRichInput>>()
const assistPopupRef = ref<InstanceType<typeof FormulaAssistPopup>>()
const promptContext = ref<FormulaPromptContext>({ type: 'none' })
const isDismissed = ref(false)

const cellRef = computed(
  () => `${colToLetter(activeCell.value.c)}${activeCell.value.r + 1}`,
)

const formulaText = ref('')
const isExpanded = ref(false)
const hasMultiLine = computed(() => formulaText.value.includes('\n'))
const isBarExpanded = computed(
  () =>
    isExpanded.value ||
    (hasMultiLine.value &&
      formulaEdit?.active.value &&
      formulaEdit.source.value === 'bar'),
)

function updatePromptContext(): void {
  if (isDismissed.value) return
  // 如果当前是单元格在编辑，顶部公式栏不弹出浮层（由单元格浮层显示）
  if (formulaEdit?.active.value && formulaEdit.source.value === 'cell') {
    promptContext.value = { type: 'none' }
    return
  }
  const text = formulaText.value
  const caret = richInputRef.value?.selectionStart ?? text.length
  promptContext.value = getFormulaPromptContext(text, caret)
}

function syncFromCell(): void {
  const s = props.sheet
  if (!s) return
  const { r, c } = activeCell.value
  const cell = s.state.getCellData(r, c)
  const raw = getCellFormulaInitial(s, r, c)
  const nextVal = raw === '=' && !cell?.f ? String(cell?.m ?? cell?.v ?? '') : raw
  if (formulaText.value !== nextVal) {
    formulaText.value = nextVal
  }
  if (formulaEdit?.active.value) {
    formulaEdit.text.value = nextVal
    formulaEdit.syncHighlights(s)
  }
  isDismissed.value = false
  promptContext.value = { type: 'none' }
}

watch(
  () => [props.revision, activeCell.value.r, activeCell.value.c] as const,
  ([, r, c], old) => {
    const cellChanged = old && (old[1] !== r || old[2] !== c)
    if (cellChanged && formulaEdit?.active.value && formulaEdit.source.value === 'bar') {
      const s = props.sheet
      const val = formulaText.value
      if (s) {
        if (val.trimStart().startsWith('=')) {
          s.chain().setCellFormula({ r: old[1], c: old[2], formula: val }).run()
        } else {
          s.chain().setCellValue({ r: old[1], c: old[2], value: val }).run()
        }
      }
      formulaEdit.cancel()
    }
    if (formulaEdit?.active.value) {
      formulaEdit.syncHighlights(props.sheet)
      return
    }
    syncFromCell()
  },
  { immediate: true },
)

watch(
  () => formulaEdit?.text.value,
  (v) => {
    if (formulaEdit?.active.value && v !== undefined && v !== formulaText.value) {
      formulaText.value = v
      formulaEdit.syncHighlights(props.sheet)
      updatePromptContext()
    }
  },
)

function onFormulaFocus(): void {
  if (!formulaEdit?.active.value) {
    syncFromCell()
    if (formulaEdit) {
      const { r, c } = activeCell.value
      formulaEdit.start(r, c, formulaText.value, 'bar')
    }
  } else if (formulaEdit) {
    formulaEdit.source.value = 'bar'
  }
  isDismissed.value = false
  nextTick(updatePromptContext)
}

function onCaretChange(pos: number): void {
  if (formulaEdit?.active.value) {
    formulaEdit.caret.value = pos
    formulaEdit.syncHighlights(props.sheet)
  }
  updatePromptContext()
}

function onFormulaRichInput(): void {
  const v = formulaText.value
  isDismissed.value = false
  if (formulaEdit?.active.value) {
    formulaEdit.source.value = 'bar'
    formulaEdit.setText(v)
    formulaEdit.syncHighlights(props.sheet)
  } else if (v.trimStart().startsWith('=') && formulaEdit) {
    const { r, c } = activeCell.value
    formulaEdit.start(r, c, v, 'bar')
    formulaEdit.syncHighlights(props.sheet)
  }
  nextTick(updatePromptContext)
}

function commitFormula(): void {
  promptContext.value = { type: 'none' }
  const { r, c } = activeCell.value
  const s = props.sheet
  if (!s) return
  const val = formulaText.value
  if (val.trimStart().startsWith('=')) {
    s.chain().setCellFormula({ r, c, formula: val }).run()
  } else {
    s.chain().setCellValue({ r, c, value: val }).run()
  }
  formulaEdit?.cancel()
}

function onFormulaKeydown(e: KeyboardEvent): void {
  if (promptContext.value.type === 'search') {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      assistPopupRef.value?.moveNext()
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      assistPopupRef.value?.movePrev()
      return
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      const ok = assistPopupRef.value?.selectCurrent()
      if (ok) {
        e.preventDefault()
        return
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      promptContext.value = { type: 'none' }
      isDismissed.value = true
      return
    }
  } else if (promptContext.value.type === 'help') {
    if (e.key === 'Escape') {
      e.preventDefault()
      promptContext.value = { type: 'none' }
      isDismissed.value = true
      return
    }
  }

  if (e.key === 'Enter') {
    if (e.altKey) {
      // Option/Alt + Enter：公式栏内换行，不提交
      return
    }
    e.preventDefault()
    commitFormula()
  }
}

function onSelectEntry(entry: FormulaBuiltinEntry): void {
  if (promptContext.value.type === 'search') {
    const range = promptContext.value.replaceRange
    richInputRef.value?.insertText(`${entry.name}(`, range)
    isDismissed.value = false
    nextTick(() => {
      richInputRef.value?.focus()
      updatePromptContext()
    })
  }
}

function onFormulaBlur(_e: FocusEvent): void {
  // 对齐 Luckysheet：失焦不强制提前提交未闭合公式，避免提前执行公式求值报 #ERROR!
  // 用户在表格内点击其他单元格或按 Enter 时统一提交
}
</script>

<template>
  <div class="sheet-formula-bar" :class="{ 'is-multiline': isBarExpanded }">
    <a-input class="cell-ref-input" :value="cellRef" readonly size="small" :bordered="false" />

    <div class="formula-input-wrapper">
      <FormulaRichInput
        ref="richInputRef"
        v-model="formulaText"
        input-class="formula-input"
        @focus="onFormulaFocus"
        @input="onFormulaRichInput"
        @caret-change="onCaretChange"
        @keydown="onFormulaKeydown"
        @blur="onFormulaBlur"
      />
      <FormulaAssistPopup
        ref="assistPopupRef"
        :context="promptContext"
        @select="onSelectEntry"
        @close="promptContext = { type: 'none' }"
      />
    </div>

    <a-button
      v-if="hasMultiLine || isExpanded"
      type="text"
      size="small"
      class="formula-bar-expand-btn"
      :title="isExpanded ? '收起公式栏' : '展开公式栏'"
      @click="isExpanded = !isExpanded"
    >
      <UpOutlined v-if="isExpanded" />
      <DownOutlined v-else />
    </a-button>
  </div>
</template>

<style scoped lang="less">
.sheet-formula-bar {
  min-height: calc(var(--ant-control-height-sm) + 8px);
  display: flex;
  align-items: flex-start;
  border-bottom: 1px solid var(--speed-color-border-gray, var(--ant-color-border));
  padding: 4px var(--ant-size-sm, 8px);
  background: var(--ant-color-bg-container);
  flex-shrink: 0;
  transition: min-height 0.15s ease;

  &.is-multiline {
    max-height: 140px;
    overflow-y: auto;
  }
}

:deep(.cell-ref-input) {
  width: 50px;
  flex-shrink: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: center;
  padding-top: 1px;
}

.formula-input-wrapper {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
}

:deep(.formula-input) {
  flex: 1;
  min-width: 0;
  min-height: calc(var(--ant-control-height-sm) - 4px);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.formula-bar-expand-btn {
  flex-shrink: 0;
  margin-left: 4px;
  margin-top: 1px;
  color: var(--ant-color-text-tertiary);
  font-size: 11px;
  padding: 0 4px;
  height: 22px;

  &:hover {
    color: var(--ant-color-primary);
  }
}
</style>

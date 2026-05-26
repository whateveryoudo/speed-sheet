<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { colToLetter, type Sheet } from '@speed-sheet/core'
import {
  useSheetSelection,
  useFormulaEditOptional,
  FormulaRichInput,
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

const cellRef = computed(
  () => `${colToLetter(activeCell.value.c)}${activeCell.value.r + 1}`,
)

const formulaText = ref('')

function syncFromCell(): void {
  const s = props.sheet
  if (!s) return
  const { r, c } = activeCell.value
  const cell = s.state.getCellData(r, c)
  const raw = cell?.f ?? String(cell?.m ?? cell?.v ?? '')
  formulaText.value = raw
  if (formulaEdit?.active.value) {
    formulaEdit.text.value = raw
    formulaEdit.syncHighlights(s)
  }
}

watch(
  () => [props.revision, activeCell.value.r, activeCell.value.c] as const,
  () => {
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
    if (formulaEdit?.active.value && v !== undefined) {
      formulaText.value = v
      formulaEdit.syncHighlights(props.sheet)
    }
  },
)

function onFormulaFocus(): void {
  syncFromCell()
  if (formulaEdit) {
    const { r, c } = activeCell.value
    formulaEdit.start(r, c, formulaText.value)
  }
}

function onFormulaRichInput(): void {
  const v = formulaText.value
  if (formulaEdit?.active.value) {
    formulaEdit.setText(v)
    formulaEdit.syncHighlights(props.sheet)
  } else if (v.trimStart().startsWith('=') && formulaEdit) {
    const { r, c } = activeCell.value
    formulaEdit.start(r, c, v)
    formulaEdit.syncHighlights(props.sheet)
  }
}

function commitFormula(): void {
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

function onFormulaBlur(e: FocusEvent): void {
  const rel = e.relatedTarget as Node | null
  if (rel && props.boundary?.contains(rel)) return
  commitFormula()
}
</script>

<template>
  <div class="sheet-formula-bar">
    <a-input class="cell-ref-input" :value="cellRef" readonly size="small" :bordered="false" />

    <!-- <a-typography-text class="fx-label">fx</a-typography-text> -->
    <FormulaRichInput v-model="formulaText" input-class="formula-input" @focus="onFormulaFocus"
      @input="onFormulaRichInput" @keydown.enter.prevent="commitFormula" @blur="onFormulaBlur" />
  </div>
</template>

<style scoped lang="less">
.sheet-formula-bar {
  height: calc(var(--ant-control-height-sm) + 8px);
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--speed-color-border-gray, var(--ant-color-border));
  padding: 0 var(--ant-size-sm, 8px);
  background: var(--ant-color-bg-container);
  flex-shrink: 0;
}

:deep(.cell-ref-input) {
  width: 50px;
  flex-shrink: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: center;

}



.fx-label {
  flex-shrink: 0;
  font-style: italic;
  user-select: none;
}

:deep(.formula-input) {
  flex: 1;
  min-width: 0;
  min-height: calc(var(--ant-control-height-sm) - 4px);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
</style>

<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import { colToLetter, type Sheet } from '@speed-sheet/core'
import { useSheetSelection } from '@speed-sheet/vue3'

const props = defineProps<{
  sheet: Sheet | null
  revision: number
}>()

const sheetRef = toRef(() => props.sheet)
const revisionRef = toRef(() => props.revision)
const { activeCell } = useSheetSelection(sheetRef, revisionRef)

const cellRef = computed(
  () => `${colToLetter(activeCell.value.c)}${activeCell.value.r + 1}`,
)

const formulaText = ref('')

function syncFromCell(): void {
  const s = props.sheet
  if (!s) return
  const { r, c } = activeCell.value
  const cell = s.state.getCellData(r, c)
  formulaText.value = cell?.f ?? String(cell?.m ?? cell?.v ?? '')
}

watch(
  () => [props.revision, activeCell.value.r, activeCell.value.c] as const,
  syncFromCell,
  { immediate: true },
)

function onFormulaFocus(): void {
  syncFromCell()
}

function commitFormula(): void {
  const { r, c } = activeCell.value
  props.sheet?.chain().setCellValue({ r, c, value: formulaText.value }).run()
}
</script>

<template>
  <div class="sheet-formula-bar">
    <a-input
      class="cell-ref-input"
      :value="cellRef"
      readonly
      size="small"
    />
    <a-typography-text type="secondary" class="fx-label">fx</a-typography-text>
    <a-input
      v-model:value="formulaText"
      class="formula-input"
      size="small"
      allow-clear
      @focus="onFormulaFocus"
      @press-enter="commitFormula"
    />
  </div>
</template>

<style scoped src="./sheet-chrome.less"></style>

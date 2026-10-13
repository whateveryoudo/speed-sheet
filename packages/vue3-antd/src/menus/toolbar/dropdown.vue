<template>
  <s-keymap-tip :title="editableCpt ? t('toolbar.dropdown') : null">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :disabled="!editableCpt"
      @click="onOpenDropdown"
    >
      <span class="inline-flex items-center justify-center">
        <DownCircleOutlined style="font-size: 16px;" />
      </span>
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { DownCircleOutlined } from '@ant-design/icons-vue'
import { useI18n } from 'vue-i18n'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useDropdownConfigPanelOptional } from '../../composables/useDropdownConfigPanel'

const { t } = useI18n()
const { sheet, editableCpt } = useSheetToolbar()
const dropdownPanel = useDropdownConfigPanelOptional()

function onOpenDropdown() {
  const s = sheet.value
  if (!s || !dropdownPanel) return
  const sel = s.state.getSelection()
  const r = sel.anchor?.r ?? Math.min(sel.row[0], sel.row[1])
  const c = sel.anchor?.c ?? Math.min(sel.column[0], sel.column[1])
  dropdownPanel.openPanel({ r, c })
}
</script>

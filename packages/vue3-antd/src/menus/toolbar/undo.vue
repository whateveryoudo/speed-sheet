<template>
  <s-keymap-tip :title="editableCpt ? t('toolbar.undo') : null" :key-map="keyMap">
    <a-button
      :disabled="!editableCpt"
      type="text"
      class="shadow-btn-wrapper"
      @click="undo"
    >
      <s-icon-font type="icon-kl-undo" :size="17" />
      <!-- <undo-outlined class="text-[16px]" /> -->
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { UndoOutlined } from '@ant-design/icons-vue'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('undo')
const { sheet, editableCpt } = useSheetToolbar()

function undo() {
  sheet.value?.chain().undo().run()
}
</script>

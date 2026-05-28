<template>
  <s-keymap-tip :title="editableCpt ? t('toolbar.redo') : null" :key-map="keyMap">
    <a-button :disabled="!editableCpt || !canRedoCpt" type="text" class="shadow-btn-wrapper" @click="redo">
      <s-icon-font type="icon-kl-redo" :size="17" />
      <!-- <redo-outlined class="text-[16px]" /> -->
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RedoOutlined } from '@ant-design/icons-vue'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('redo')
const { sheet, editableCpt, revision } = useSheetToolbar()

const canRedoCpt = computed(() => {
  void revision.value
  return sheet.value?.canRedo() ?? false
})

function redo() {
  sheet.value?.chain().redo().run()
}
</script>

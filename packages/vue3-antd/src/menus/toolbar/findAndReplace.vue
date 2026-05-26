<template>
  <s-keymap-tip :title="editableCpt ? t('toolbar.findAndReplace') : null" :key-map="keyMap">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :disabled="!editableCpt"
      @click="openFindReplace"
    >
      <file-search-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { FileSearchOutlined } from '@ant-design/icons-vue'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('findAndReplace')
const { editableCpt, findReplaceOpen } = useSheetToolbar()

function openFindReplace() {
  findReplaceOpen.value = true
  message.info(t('toolbar.findAndReplaceHint'))
}
</script>

<template>
  <s-keymap-tip :keyMap="getShortcutTipByKey('link')" :title="editableCpt ? t('toolbar.link') : null">
    <a-button
      type="text"
      class="shadow-btn-wrapper"
      :disabled="!editableCpt"
      @click="onLink"
    >
      <link-outlined />
    </a-button>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { message } from 'ant-design-vue'
import { useI18n } from 'vue-i18n'
import { LinkOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../../composables/useSheetToolbar'
import { getShortcutTipByKey } from '../../../helpers/registKeyMap'

const { t } = useI18n()
const { editableCpt } = useSheetToolbar()

function onLink() {
  message.info(t('toolbar.insertLinkHint'))
}
</script>

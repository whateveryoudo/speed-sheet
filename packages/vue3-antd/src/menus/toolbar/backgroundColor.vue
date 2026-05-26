<template>
  <s-keymap-tip :title="disableMenu ? null : t('toolbar.backgroundColor')" :key-map="keyMap">
    <div class="flex items-center">
      <a-button
        type="text"
        class="shadow-btn-wrapper small"
        :disabled="disableMenu"
        @mousedown.prevent="setBackgroundColor(curColor)"
      >
        <span class="relative flex">
          <s-icon-font :size="17" type="icon-kl-fill-color" />
          <span
            class="absolute bottom-0 h-2px w-80% left-10%"
            :style="{ backgroundColor: curColor || '#fff' }"
          />
        </span>
      </a-button>
      <color-picker :cur-color="curColor" :disabled="disableMenu" @trigger-color="setBackgroundColor">
        <a-button type="text" class="shadow-btn-wrapper small" :disabled="disableMenu" @mousedown.prevent>
          <caret-down-outlined />
        </a-button>
      </color-picker>
    </div>
  </s-keymap-tip>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CaretDownOutlined } from '@ant-design/icons-vue'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import ColorPicker from './colorPicker/index.vue'
import type { ColorType } from './colorPicker/data'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const keyMap = getShortcutTipByKey('backgroundColor')
const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const curColor = ref<ColorType>(activeCell.value?.bg ?? '#ffffff')

const disableMenu = computed(() => !editableCpt.value)

function setBackgroundColor(color: ColorType) {
  if (!color || !sheet.value) return
  curColor.value = color
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setBgColor({ r, c, color: color as string }).run()
  })
}
</script>

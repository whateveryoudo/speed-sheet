<template>
  <s-keymap-tip :title="disableMenu ? null : t('toolbar.textColor')" :key-map="keyMap">
    <div class="flex items-center">
      <a-button
        type="text"
        class="shadow-btn-wrapper middle -mt-1px"
        :disabled="disableMenu"
        @click="setColor(curColor)"
      >
        <span class="relative flex flex-col text-16px">
          <span :class="disableMenu ? 'text-black/25' : 'text-black'">A</span>
          <span
            class="absolute bottom-3px h-2px w-130% left-[-1px]"
            :style="{ backgroundColor: disableMenu ? 'rgba(0,0,0,0.25)' : curColor || 'transparent' }"
          />
        </span>
      </a-button>
      <color-picker :cur-color="curColor" show-default :disabled="disableMenu" @trigger-color="setColor">
        <a-button
          type="text"
          class="shadow-btn-wrapper small dropdown-trigger"
          :disabled="disableMenu"
          @mousedown.prevent
        >
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
const keyMap = getShortcutTipByKey('textColor')
const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

const curColor = ref<ColorType>(activeCell.value?.fc ?? '#000000')

const disableMenu = computed(() => !editableCpt.value)

function setColor(color: ColorType) {
  if (!color || !sheet.value) return
  curColor.value = color
  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setFontColor({ r, c, color: color as string }).run()
  })
}
</script>

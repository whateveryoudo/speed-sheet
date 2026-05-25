<template>
  <s-keymap-tip :title="disableMenu ? null : '背景颜色'">
    <div class="bg-color-menu-wrapper">
      <a-button
        type="text"
        class="shadow-btn-wrapper small"
        :disabled="disableMenu"
        @mousedown.prevent="setBackgroundColor(curColor)"
      >
        <span class="text-wrapper">
          <s-icon-font :size="17" type="icon-kl-fill-color" />
          <span class="under-line" :style="{ backgroundColor: curColor || '#fff' }" />
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
import { CaretDownOutlined } from '@ant-design/icons-vue'
import ColorPicker from './colorPicker/index.vue'
import type { ColorType } from './colorPicker/data'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

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

<style scoped lang="less">
.bg-color-menu-wrapper {
  display: flex;
  align-items: center;
  .text-wrapper {
    display: flex;
    position: relative;
    .under-line {
      position: absolute;
      bottom: 0;
      height: 2px;
      width: 80%;
      left: 10%;
    }
  }
}
</style>

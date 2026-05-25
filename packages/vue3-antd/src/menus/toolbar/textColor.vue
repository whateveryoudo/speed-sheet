<template>
  <s-keymap-tip :title="disableMenu ? null : '字体颜色'">
    <div class="text-color-menu-wrapper">
      <a-button
        type="text"
        class="shadow-btn-wrapper middle"
        style="margin-top: -1px"
        :disabled="disableMenu"
        @click="setColor(curColor)"
      >
        <span class="text-wrapper">
          <span :style="{ color: disableMenu ? 'rgba(0, 0, 0, 0.25)' : '#000' }">A</span>
          <span
            class="under-line"
            :style="{ backgroundColor: disableMenu ? 'rgba(0, 0, 0, 0.25)' : curColor || 'transparent' }"
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
import { CaretDownOutlined } from '@ant-design/icons-vue'
import ColorPicker from './colorPicker/index.vue'
import type { ColorType } from './colorPicker/data'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

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

<style scoped lang="less">
.text-color-menu-wrapper {
  display: flex;
  align-items: center;
  .text-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    font-size: 16px;
    .under-line {
      position: absolute;
      bottom: 3px;
      height: 2px;
      width: 130%;
      margin-left: -15%;
    }
  }
}
</style>

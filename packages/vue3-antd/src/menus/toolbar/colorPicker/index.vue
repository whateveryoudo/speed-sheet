<template>
  <a-popover
    v-if="!disabled"
    overlay-class-name="color-board-popover-wrapper"
    trigger="click"
    placement="bottomLeft"
  >
    <template #content>
      <ColorBoard
        :cur-color="curColor"
        :show-default="showDefault"
        :clear-label="clearLabel"
        @pick="chooseColor"
      />
    </template>
    <slot />
  </a-popover>
  <slot v-else />
</template>

<script setup lang="ts">
import ColorBoard from './ColorBoard.vue'
import type { ColorType } from './data'

defineProps({
  curColor: {
    type: String as () => ColorType,
    default: '',
  },
  showDefault: {
    type: Boolean,
    default: false,
  },
  clearLabel: {
    type: String,
    default: '无填充色',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  triggerColor: [color: ColorType]
}>()

function chooseColor(color: ColorType) {
  emit('triggerColor', color)
}
</script>

<style lang="less">
.color-board-popover-wrapper {
  .ant-popover-inner {
    padding: 0;
  }
}
</style>

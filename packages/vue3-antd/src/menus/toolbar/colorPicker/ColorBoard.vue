<template>
  <div class="color-board-wrapper">
    <div
      class="top-choosed-wrapper"
      @mousedown.prevent="chooseColor(showDefault ? defaultColor : null)"
    >
      <div v-if="showDefault" class="top-choosed-item">
        <span class="color-board-item">
          <span class="color-inner" :style="{ backgroundColor: defaultColor }" />
        </span>
        默认
      </div>
      <div v-else class="top-choosed-item">
        <span class="color-board-item no-color"><span class="color-inner" /></span>
        {{ clearLabel }}
      </div>
    </div>
    <ul class="color-board-list-wrapper">
      <li
        v-for="(color, index) in colors"
        :key="index"
        class="color-board-item"
        @mousedown.prevent="chooseColor(color)"
      >
        <span class="color-inner" :style="{ backgroundColor: color }" />
        <check-outlined v-if="color === curColor" class="checked-icon" />
      </li>
    </ul>
    <s-color-picker
      placement="right"
      :color="curColor ?? '#000000'"
      :get-popup-container="getPopupContainer"
      @update:color="chooseColor"
      @open-change="onPickerOpenChange"
    >
      <div class="color-board-more" @mousedown.stop @click.stop>
        更多颜色
      </div>
    </s-color-picker>
  </div>
</template>

<script setup lang="ts">
import { CheckOutlined } from '@ant-design/icons-vue'
import { colors, type ColorType } from './data'

const defaultColor: ColorType = '#000000'

withDefaults(
  defineProps<{
    curColor?: ColorType
    showDefault?: boolean
    clearLabel?: string
    getPopupContainer?: (triggerNode: HTMLElement) => HTMLElement
  }>(),
  {
    curColor: '',
    showDefault: false,
    clearLabel: '无填充色',
  },
)

const emit = defineEmits<{
  pick: [color: ColorType]
  'picker-open-change': [open: boolean]
}>()

function chooseColor(color: ColorType) {
  emit('pick', color)
}

function onPickerOpenChange(open: boolean): void {
  emit('picker-open-change', open)
}
</script>

<style lang="less">
.color-board-wrapper {
  width: 240px;
  padding-top: 5px;

  .top-choosed-item {
    display: flex;
    padding: 8px;
    cursor: pointer;
    align-items: center;

    .color-board-item {
      margin-right: 5px;
    }

    .no-color > span {
      border: 1px solid var(--speed-color-border-light, #f4f5f5);
      position: relative;

      &::after {
        position: absolute;
        top: 8px;
        left: 0;
        width: 17px;
        height: 0;
        content: '';
        transform: rotate(45deg);
        border-bottom: 2px solid #ff5151;
      }
    }
  }
  // 增加flex,防止底部tab-bar a-menu内部对ul的影响
  .color-board-list-wrapper {
    margin: 0;
    padding: 8px;
    font-size: 0;
    list-style: none;
    display: flex;
    flex-wrap: wrap;
  }

  .color-board-more {
    padding: 8px;
    cursor: pointer;
    border-top: 1px solid var(--speed-color-border-gray, var(--ant-color-border));
    border-radius: 0 0 4px 4px;

    &:hover {
      background: var(--speed-color-bg-gray-1, var(--ant-color-fill-quaternary));
    }
  }

  .color-board-item {
    width: 24px;
    height: 24px;
    padding: 2px;
    display: inline-block;
    border-radius: 3px;
    border: 1px solid transparent;
    cursor: pointer;
    position: relative;

    &:hover {
      border: 1px solid var(--speed-color-bg-gray-2, #d8dad9);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
    }

    .color-inner {
      width: 18px;
      height: 18px;
      display: block;
      border-radius: 2px;
    }

    .checked-icon {
      font-size: 12px;
      color: #fff;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }
}
</style>

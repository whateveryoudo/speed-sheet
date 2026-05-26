<template>
  <a-popover trigger="hover" placement="rightTop" :mouse-enter-delay="0.2" :z-index="1100" :arrow="false"
    :get-popup-container="getPopupContainer" overlay-class-name="formula-menu-hint-popover">
    <template #content>
      <div class="formula-menu-hint">
        <div class="formula-menu-hint-name">{{ fn.syntax }}</div>
        <div class="formula-menu-hint-desc">{{ fn.hint }}</div>
      </div>
    </template>
    <span class="formula-menu-item-trigger">
      <slot />
    </span>
  </a-popover>
</template>

<script setup lang="ts">
import type { FormulaBuiltinEntry } from '@speed-sheet/extension-formula'

defineProps<{
  fn: FormulaBuiltinEntry
}>()

function getPopupContainer(): HTMLElement {
  return document.body
}
</script>

<style scoped lang="less">
.formula-menu-hint {
  width: 220px;
  font-size: var(--ant-font-size-sm);
  line-height: 1.5;
}

.formula-menu-hint-name {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 500;
  margin-bottom: 6px;
}

.formula-menu-hint-desc {
  margin: 0;
  color: var(--ant-color-text-secondary);
}
</style>

<style lang="less">
.formula-menu-hint-popover {
  z-index: 1100;

  .ant-popover-inner {
    padding: 10px 12px;
  }
}
</style>

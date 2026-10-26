<template>
  <div
    class="formula-menu-item-wrapper"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <a-popover
      v-if="isHovered"
      :open="true"
      placement="rightTop"
      :z-index="1100"
      :arrow="false"
      :get-popup-container="getPopupContainer"
      overlay-class-name="formula-menu-hint-popover"
    >
      <template #content>
        <div class="formula-menu-hint">
          <div class="formula-menu-hint-name">{{ fn.syntax }}</div>
          <div class="formula-menu-hint-desc">{{ fn.hint }}</div>
        </div>
      </template>
      <div class="formula-menu-item-trigger">
        <slot />
      </div>
    </a-popover>
    <div v-else class="formula-menu-item-trigger">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import type { FormulaBuiltinEntry } from '@speed-sheet/extension-formula'

defineProps<{
  fn: FormulaBuiltinEntry
}>()

const isHovered = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function onMouseEnter() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    isHovered.value = true
  }, 30)
}

function onMouseLeave() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  isHovered.value = false
}

onUnmounted(() => {
  if (timer) clearTimeout(timer)
})

function getPopupContainer(): HTMLElement {
  return document.body
}
</script>

<style scoped lang="less">
.formula-menu-item-wrapper {
  display: block;
  width: 100%;
}

.formula-menu-item-trigger {
  display: block;
  margin: -5px -12px;
  padding: 5px 12px;
}

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
  pointer-events: none;

  .ant-popover-inner {
    padding: 10px 12px;
  }
}
</style>

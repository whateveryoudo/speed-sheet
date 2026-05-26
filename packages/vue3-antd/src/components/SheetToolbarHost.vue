<template>
  <div class="sheet-toolbar-host">
    <slot />
  </div>
</template>

<style scoped lang="less">
.sheet-toolbar-host {
  flex-shrink: 0;
  border-bottom: 1px solid var(--speed-color-border-gray, var(--ant-color-border));
  background: var(--ant-color-bg-container);
  padding: 4px var(--ant-size-sm, 8px);
  min-height: var(--ant-control-height);
  display: flex;
  align-items: center;
}
</style>

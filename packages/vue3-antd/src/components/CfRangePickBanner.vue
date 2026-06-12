<template>
  <div class="cf-range-pick-banner">
    {{ t('conditionalFormat.rangePickHint') }}
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<style scoped lang="less">
.cf-range-pick-banner {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  padding: 6px 14px;
  border-radius: 4px;
  background: rgba(26, 115, 232, 0.92);
  color: #fff;
  font-size: 12px;
  line-height: 1.4;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
</style>

<!-- SheetDropdown 扩展统一气泡宿主：配置面板 + 取值面板 -->
<template>
  <DropdownConfigMenu :extension="extension" :boundary="boundary" />
  <DropdownPickMenu :extension="extension" :boundary="boundary" />
</template>

<script setup lang="ts">
import type { Extension } from '@speed-sheet/core'
import type { Ref } from 'vue'
import DropdownConfigMenu from '../dropdownConfigMenu/index.vue'
import DropdownPickMenu from '../dropdownPickMenu/index.vue'

defineProps<{
  extension: Extension
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()
</script>

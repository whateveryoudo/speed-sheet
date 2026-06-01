<template>
  <component
    v-for="menu in bubbleMenus"
    :key="menu.key"
    :is="menu.component"
    :extension="menu.extension"
    :boundary="boundary"
  />
</template>

<script setup lang="ts">
import { computed, type Component, type Ref } from 'vue'
import type { Extension, Sheet } from '@speed-sheet/core'

const props = defineProps<{
  sheet: Sheet | null
  boundary: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()

const bubbleMenus = computed(() => {
  const s = props.sheet
  if (!s) return [] as { key: string; component: Component; extension: Extension }[]
  const menus: { key: string; component: Component; extension: Extension }[] = []
  for (const ext of s.extensions) {
    const component = ext.getBubbleMenu() as Component | null | undefined
    if (component) menus.push({ key: ext.name, component, extension: ext })
  }
  return menus
})
</script>

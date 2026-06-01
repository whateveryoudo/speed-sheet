<template>
  <component
    v-for="view in nodeViews"
    :key="view.key"
    :is="view.component"
    :extension="view.extension"
  />
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import type { Extension, Sheet } from '@speed-sheet/core'

const props = defineProps<{
  sheet: Sheet | null
}>()

const nodeViews = computed(() => {
  const s = props.sheet
  if (!s) return [] as { key: string; component: Component; extension: Extension }[]
  const views: { key: string; component: Component; extension: Extension }[] = []
  for (const ext of s.extensions) {
    const component = ext.getNodeView() as Component | null | undefined
    if (component) views.push({ key: ext.name, component, extension: ext })
  }
  return views
})
</script>

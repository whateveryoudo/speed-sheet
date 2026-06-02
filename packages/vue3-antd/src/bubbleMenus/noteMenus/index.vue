<template>
  <NoteConfigMenu :extension="extension" :boundary="boundary" />
  <NoteHoverTracker :boundary="boundary" />
</template>

<script setup lang="ts">
import type { Extension } from '@speed-sheet/core'
import type { Ref } from 'vue'
import NoteConfigMenu from '../noteConfigMenu/index.vue'
import NoteHoverTracker from './NoteHoverTracker.vue'

defineProps<{
  extension: Extension
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()
</script>

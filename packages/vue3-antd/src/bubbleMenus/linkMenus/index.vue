<template>
  <LinkConfigMenu :extension="extension" :boundary="boundary" />
  <LinkToolbarMenu :extension="extension" :boundary="boundary" />
</template>

<script setup lang="ts">
import type { Extension } from '@speed-sheet/core'
import type { Ref } from 'vue'
import LinkConfigMenu from '../linkConfigMenu/index.vue'
import LinkToolbarMenu from '../linkToolbarMenu/index.vue'

defineProps<{
  extension: Extension
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()
</script>

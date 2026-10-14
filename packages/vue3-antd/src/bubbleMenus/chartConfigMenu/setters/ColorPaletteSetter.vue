<template>
  <div class="color-palette-setter">
    <a-select
      :value="currentPaletteId"
      style="width: 100%"
      dropdown-class-name="chart-palette-dropdown"
      @change="(val) => onSelectPalette(String(val))"
    >
      <a-select-option v-for="pal in COLOR_PALETTES" :key="pal.id" :value="pal.id">
        <div class="palette-option-item">
          <span class="palette-name">{{ pal.name }}</span>
          <div class="palette-strip">
            <span
              v-for="(c, cIdx) in pal.colors"
              :key="cIdx"
              class="palette-block"
              :style="{ backgroundColor: c }"
            />
          </div>
        </div>
      </a-select-option>
    </a-select>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { COLOR_PALETTES } from '../schema'


const props = defineProps<{
  value?: string[]
}>()

const emit = defineEmits<{
  'update:value': [colors: string[]]
  change: [colors: string[]]
}>()

const currentPaletteId = computed(() => {
  if (!props.value || !props.value.length) return 'default'
  const curFirst = props.value[0]
  const matched = COLOR_PALETTES.find((p) => p.colors[0] === curFirst)
  return matched ? matched.id : 'default'
})

function onSelectPalette(id: string) {
  const target = COLOR_PALETTES.find((p) => p.id === id)
  if (target) {
    emit('update:value', target.colors)
    emit('change', target.colors)
  }
}
</script>

<style scoped>
.color-palette-setter {
  width: 100%;
}

.palette-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 2px 0;
}

.palette-name {
  font-size: 12px;
  color: var(--ant-color-text, #333333);
}

.palette-strip {
  display: inline-flex;
  border-radius: 0;
  overflow: hidden;
  box-shadow: 0 0 1px rgba(0, 0, 0, 0.15);
}

.palette-block {
  display: inline-block;
  width: 15px;
  height: 14px;
  border-radius: 0;
}
</style>

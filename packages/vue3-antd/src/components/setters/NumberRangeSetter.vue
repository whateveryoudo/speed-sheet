<template>
  <div class="speed-setter-number-range">
    <div class="range-col">
      <div v-if="minLabel" class="range-sub-label">{{ minLabel }}</div>
      <a-input-number
        :value="min"
        :placeholder="minPlaceholder"
        :size="size"
        :disabled="disabled"
        style="width: 100%"
        @change="onMinChange"
      />
    </div>
    <div class="range-col">
      <div v-if="maxLabel" class="range-sub-label">{{ maxLabel }}</div>
      <a-input-number
        :value="max"
        :placeholder="maxPlaceholder"
        :size="size"
        :disabled="disabled"
        style="width: 100%"
        @change="onMaxChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    min?: number
    max?: number
    minLabel?: string
    maxLabel?: string
    minPlaceholder?: string
    maxPlaceholder?: string
    size?: 'small' | 'middle' | 'large'
    disabled?: boolean
  }>(),
  {
    min: undefined,
    max: undefined,
    minLabel: '最小值',
    maxLabel: '最大值',
    minPlaceholder: '自动',
    maxPlaceholder: '自动',
    size: 'middle',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:min': [val: number | undefined]
  'update:max': [val: number | undefined]
  change: [range: { min?: number; max?: number }]
}>()

function onMinChange(val: any) {
  const num = typeof val === 'number' ? val : undefined
  emit('update:min', num)
  emit('change', { min: num, max: props.max })
}

function onMaxChange(val: any) {
  const num = typeof val === 'number' ? val : undefined
  emit('update:max', num)
  emit('change', { min: props.min, max: num })
}
</script>

<style scoped>
.speed-setter-number-range {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  width: 100%;
}

.range-col {
  display: flex;
  flex-direction: column;
}

.range-sub-label {
  font-size: 11px;
  color: var(--ant-color-text-tertiary, #8c8c8c);
  margin-bottom: 4px;
}
</style>

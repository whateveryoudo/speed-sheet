<template>
  <div class="speed-setter-select">
    <a-select
      :value="value"
      :options="options"
      :placeholder="placeholder"
      :size="size"
      :disabled="disabled"
      style="width: 100%"
      @change="onSelectChange"
    />
  </div>
</template>

<script setup lang="ts">
export interface SelectSetterOption {
  label: string
  value: any
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    value?: any
    options?: SelectSetterOption[]
    placeholder?: string
    size?: 'small' | 'middle' | 'large'
    disabled?: boolean
  }>(),
  {
    value: undefined,
    options: () => [],
    placeholder: '请选择',
    size: 'middle',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:value': [val: any]
  change: [val: any]
}>()

function onSelectChange(val: any) {
  emit('update:value', val)
  emit('change', val)
}
</script>

<style scoped>
.speed-setter-select {
  width: 100%;
}
</style>

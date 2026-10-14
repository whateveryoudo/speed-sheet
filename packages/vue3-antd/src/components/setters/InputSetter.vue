<template>
  <div class="speed-setter-input">
    <a-input
      :value="value"
      :placeholder="placeholder"
      :size="size"
      :disabled="disabled"
      allow-clear
      @change="onInputChange"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    value?: string
    placeholder?: string
    size?: 'small' | 'middle' | 'large'
    disabled?: boolean
  }>(),
  {
    value: '',
    placeholder: '',
    size: 'middle',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:value': [val: string]
  change: [val: string]
}>()

function onInputChange(e: any) {
  const val = e?.target?.value ?? ''
  emit('update:value', val)
  emit('change', val)
}
</script>

<style scoped>
.speed-setter-input {
  width: 100%;
}
</style>

<template>
  <div class="sheet-dropdown-panel" @mousedown.stop>
    <div class="sheet-dropdown-panel__head">
      <span class="sheet-dropdown-panel__title">下拉列表</span>
      <a-space :size="12">
        <a-checkbox v-model:checked="multiSelect">多选</a-checkbox>
        <a-checkbox v-model:checked="useColor">颜色</a-checkbox>
      </a-space>
    </div>
    <div class="sheet-dropdown-panel__list">
      <div v-for="(opt, idx) in options" :key="idx" class="sheet-dropdown-panel__row">
        <a-input :ref="idx === 0 ? bindFirstInputRef : undefined" v-model:value="opt.value" placeholder="选项"
          :style="useColor && opt.color ? { borderColor: opt.color } : undefined" />
        <delete-outlined
          class="sheet-dropdown-panel__remove"
          :class="{ 'is-disabled': options.length <= 1 }"
          @click="removeOption(idx)"
        />
        <holder-outlined class="sheet-dropdown-panel__drag" />
      </div>
    </div>
    <a-button type="link" class="px-0!" @click="addOption"> <plus-outlined />
      添加一个选项</a-button>
    <div class="sheet-dropdown-panel__foot">
      <a-button type="link" danger class="px-0!" @click="onRemove">移除</a-button>
      <a-space class="ml-auto">
        <a-button @click="emit('cancel')">取消</a-button>
        <a-button type="primary" @click="onConfirm">确认</a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { DeleteOutlined, PlusOutlined, HolderOutlined } from '@ant-design/icons-vue'
import type { Sheet } from '@speed-sheet/core'
import type { DropdownListOption } from '@speed-sheet/shared'

const props = defineProps<{
  sheet: Sheet | null
  r: number
  c: number
  applySelection?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  done: []
}>()

const multiSelect = ref(false)
const useColor = ref(false)
const hasExisting = ref(false)
const firstInputRef = ref<{ focus?: () => void } | null>(null)

function bindFirstInputRef(el: unknown): void {
  firstInputRef.value = (el as { focus?: () => void } | null) ?? null
}

function emptyOptions(): DropdownListOption[] {
  return [{ value: '' }, { value: '' }, { value: '' }]
}

const options = ref<DropdownListOption[]>(emptyOptions())

function focusFirstInput(): void {
  nextTick(() => {
    firstInputRef.value?.focus?.()
  })
}

function loadRule(): void {
  const s = props.sheet
  if (!s) return
  const rule = s.state.getDataVerification(props.r, props.c)
  if (rule?.type === 'dropdown') {
    hasExisting.value = true
    multiSelect.value = !!rule.multiSelect
    useColor.value = !!rule.useColor
    const src = rule.options?.length ? rule.options.map((o) => ({ ...o })) : emptyOptions()
    while (src.length < 3) src.push({ value: '' })
    options.value = src
  } else {
    hasExisting.value = false
    multiSelect.value = false
    useColor.value = false
    options.value = emptyOptions()
  }
  focusFirstInput()
}

watch(() => [props.sheet, props.r, props.c] as const, loadRule, { immediate: true })

function addOption(): void {
  options.value.push({ value: '' })
}

function removeOption(idx: number): void {
  if (options.value.length <= 1) return
  options.value.splice(idx, 1)
}

function eachTarget(fn: (r: number, c: number) => void): void {
  const s = props.sheet
  if (!s) return
  if (!props.applySelection) {
    fn(props.r, props.c)
    return
  }
  const sel = s.state.getSelection()
  const r0 = Math.min(sel.row[0], sel.row[1])
  const r1 = Math.max(sel.row[0], sel.row[1])
  const c0 = Math.min(sel.column[0], sel.column[1])
  const c1 = Math.max(sel.column[0], sel.column[1])
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      fn(r, c)
    }
  }
}

function onConfirm(): void {
  const s = props.sheet
  if (!s) return
  const cleaned = options.value
    .map((o) => ({ ...o, value: o.value.trim() }))
    .filter((o) => o.value)
  if (!cleaned.length) {
    emit('cancel')
    return
  }
  const value = multiSelect.value ? [] : ''
  eachTarget((r, c) => {
    s.chain()
      .insertDropdown({
        r,
        c,
        options: cleaned,
        multiSelect: multiSelect.value,
        useColor: useColor.value,
        value,
      })
      .run()
  })
  emit('done')
}

/** 移除下拉模式，恢复普通单元格 */
function onRemove(): void {
  const s = props.sheet
  if (!s) return
  if (hasExisting.value) {
    eachTarget((r, c) => {
      s.chain().removeDropdown({ r, c }).run()
    })
  }
  emit('done')
}
</script>

<style scoped lang="less">
.sheet-dropdown-panel {
  width: 300px;
  padding: 10px;
}

.sheet-dropdown-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--ant-size-sm, 12px);
}

.sheet-dropdown-panel__title {
  font-weight: var(--ant-font-weight-strong, 600);
  font-size: var(--ant-font-size);
  color: var(--ant-color-text);
}

.sheet-dropdown-panel__row {
  display: flex;
  align-items: center;
  gap: var(--ant-size-xs, 8px);
  margin-bottom: 10px;
}

.sheet-dropdown-panel__remove {
  flex-shrink: 0;
  font-size: var(--ant-font-size-lg);
  color: var(--ant-color-error);
  cursor: pointer;
  transition: color var(--ant-motion-duration-mid);

  &:hover:not(.is-disabled) {
    color: var(--ant-color-error-hover);
  }

  &.is-disabled {
    color: var(--ant-color-text-quaternary);
    cursor: not-allowed;
    pointer-events: none;
  }
}

.sheet-dropdown-panel__drag {
  flex-shrink: 0;
  font-size: var(--ant-font-size-lg);
  cursor: grab;
}

.sheet-dropdown-panel__foot {
  display: flex;
  align-items: center;
  margin-top: var(--ant-size-sm, 12px);
  padding-top: var(--ant-size-xs, 8px);
  border-top: 1px solid var(--ant-color-border-secondary);
}
</style>

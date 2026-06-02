<!--
  下拉取值气泡：canvas 展示文本，点击单元格展开/收起（对标语雀 32px + 右侧 √）。
  外观由 BubbleContainer 统一提供 padding / 背景 / 阴影，此处勿再覆盖 bubbleClassName。
-->
<template>
  <BubbleContainer
    :should-show="shouldShow"
    :anchor-rect="anchorRectRef"
    :boundary="boundary"
    placement="bottom-start"
    :offset="2"
  >
    <div v-if="!multiSelect" class="sheet-dropdown-pick-menu">
      <div
        v-for="opt in options"
        :key="opt.value"
        class="sheet-dropdown-pick-item"
        :class="{ 'is-selected': isSelected(opt.value) }"
        @mousedown.stop
        @click="pickSingle(opt.value)"
      >
        <span class="sheet-dropdown-pick-item__label">{{ opt.value }}</span>
        <CheckOutlined v-if="isSelected(opt.value)" class="sheet-dropdown-pick-item__check" />
      </div>
    </div>
    <div v-else class="sheet-dropdown-pick-menu sheet-dropdown-pick-menu--multi">
      <div
        v-for="opt in options"
        :key="opt.value"
        class="sheet-dropdown-pick-item"
        :class="{ 'is-selected': isChecked(opt.value) }"
        @mousedown.stop
        @click="toggleMulti(opt.value)"
      >
        <span class="sheet-dropdown-pick-item__label">{{ opt.value }}</span>
        <CheckOutlined v-if="isChecked(opt.value)" class="sheet-dropdown-pick-item__check" />
      </div>
    </div>
  </BubbleContainer>
</template>

<script setup lang="ts">
import { computed, watch, type ComputedRef, type Ref } from 'vue'
import { CheckOutlined } from '@ant-design/icons-vue'
import { cellRect } from '@speed-sheet/core'
import type { Extension } from '@speed-sheet/core'
import { useSheetViewport, type SheetBubbleAnchorRect } from '@speed-sheet/vue3'
import { useDropdownPickPanel } from '../../composables/useDropdownPickPanel'
import BubbleContainer from '../BubbleContainer.vue'

defineProps<{
  extension: Extension
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()

const { open, anchor: pickAnchor, closePick } = useDropdownPickPanel()
const { sheet, revision, layout, scrollX, scrollY, viewportTick } = useSheetViewport()

const rule = computed(() => {
  void revision.value
  const s = sheet.value
  if (!s) return null
  return s.state.getDataVerification(pickAnchor.r, pickAnchor.c)
})

const options = computed(() => (rule.value?.options ?? []).filter((o) => o.value))
const multiSelect = computed(() => !!rule.value?.multiSelect)

const anchorRectRef = computed((): SheetBubbleAnchorRect | null => {
  void revision.value
  void viewportTick.value
  const s = sheet.value
  if (!s || !open.value) return null
  const { r, c } = pickAnchor
  const mc = s.createMergeContext()
  const rect = cellRect(r, c, layout.value, mc)
  return {
    left: rect.x - scrollX.value,
    top: rect.y - scrollY.value,
    width: rect.w,
    height: rect.h,
  }
}) as ComputedRef<SheetBubbleAnchorRect | null>

const shouldShow = () =>
  open.value && !!sheet.value && !!anchorRectRef.value && rule.value?.type === 'dropdown'

watch(
  () => {
    void revision.value
    const s = sheet.value
    if (!s || !open.value) return null
    const sel = s.state.getSelection()
    return {
      r0: sel.row[0],
      r1: sel.row[1],
      c0: sel.column[0],
      c1: sel.column[1],
      ar: pickAnchor.r,
      ac: pickAnchor.c,
    }
  },
  (sel) => {
    if (!sel || !open.value) return
    const single = sel.r0 === sel.r1 && sel.c0 === sel.c1
    if (!single || sel.r0 !== sel.ar || sel.c0 !== sel.ac) closePick()
  },
)

function currentValue(): string | string[] | undefined {
  return rule.value?.value
}

function isSelected(value: string): boolean {
  const v = currentValue()
  if (v == null || v === '') return false
  if (Array.isArray(v)) return v[0] === value
  return String(v) === value
}

function isChecked(value: string): boolean {
  const v = currentValue()
  if (Array.isArray(v)) return v.includes(value)
  if (v == null || v === '') return false
  return String(v).split(',').map((s) => s.trim()).includes(value)
}

function toggleMulti(value: string): void {
  const s = sheet.value
  if (!s || !multiSelect.value) return
  const { r, c } = pickAnchor
  const current = rule.value?.value
  let next: string[] = Array.isArray(current)
    ? [...current]
    : current
      ? String(current).split(',').map((x) => x.trim()).filter(Boolean)
      : []
  if (next.includes(value)) next = next.filter((x) => x !== value)
  else next.push(value)
  s.chain().setDropdownValue({ r, c, value: next }).run()
}

function pickSingle(value: string): void {
  if (!value || multiSelect.value) return
  const s = sheet.value
  if (!s) return
  const { r, c } = pickAnchor
  const prev = currentValue()
  if (isSelected(value)) {
    s.chain().setDropdownValue({ r, c, value: '' }).run()
    closePick()
    return
  }
  s.chain().setDropdownValue({ r, c, value }).run()
  closePick()
}
</script>

<style scoped lang="less">
.sheet-dropdown-pick-menu {
  min-width: 120px;
  padding: 4px 0;
  overflow: hidden;
}

.sheet-dropdown-pick-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ant-size-xs, 8px);
  height: 32px;
  padding: 0 var(--ant-size-sm, 12px);
  box-sizing: border-box;
  cursor: pointer;
  font-size: var(--ant-font-size);
  border-radius: var(--ant-border-radius-sm);
  color: var(--ant-color-text);
  transition: background var(--ant-motion-duration-mid);

  &:hover {
    background: var(--ant-control-item-bg-hover);
  }

  &.is-selected {
    background: var(--ant-color-primary-bg);
    font-weight: var(--ant-font-weight-strong, 600);
  }
}

.sheet-dropdown-pick-item__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-dropdown-pick-item__check {
  flex-shrink: 0;
  font-size: var(--ant-font-size-sm);
  color: var(--ant-color-primary);
}
</style>

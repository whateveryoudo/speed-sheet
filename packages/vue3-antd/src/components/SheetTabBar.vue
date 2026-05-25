<script setup lang="ts">
import { ref, toRef, watch } from 'vue'
import { PlusOutlined, CaretDownOutlined } from '@ant-design/icons-vue'
import { VueDraggableNext as Draggable } from 'vue-draggable-next'
import type { Sheet } from '@speed-sheet/core'
import type { SheetTabMenuState } from '../menus/sheetTabMenu/types'

export interface SheetTabItem {
  id: string
  label: string
  color: string | null
}

const props = defineProps<{
  sheet: Sheet | null
  revision: number
}>()

const emit = defineEmits<{
  'tab-menu': [payload: SheetTabMenuState & { close: () => void }]
  'add-sheet': [sheetId: string]
}>()

const rootEl = ref<HTMLElement>()
const tabMenu = ref<SheetTabMenuState & { show: boolean }>({
  show: false,
  sheetId: '',
  clientX: 0,
  clientY: 0,
})

const sheetRef = toRef(() => props.sheet)
const tabItems = ref<SheetTabItem[]>([])
const activeSheetId = ref('')

function buildTabs(): SheetTabItem[] {
  const s = sheetRef.value
  if (!s) return []
  return s.getVisibleSheetIds().map((id) => ({
    id,
    label: s.getSheetName(id) || id,
    color: s.getSheetTabColor(id),
  }))
}

watch(
  () => [props.revision, props.sheet] as const,
  () => {
    tabItems.value = buildTabs()
    activeSheetId.value = sheetRef.value?.getActiveSheetId() ?? ''
  },
  { immediate: true },
)

function tabAccentStyle(tab: SheetTabItem): Record<string, string> {
  if (!tab.color) return {}
  return { borderBottomColor: tab.color }
}

function closeTabMenu(): void {
  tabMenu.value.show = false
}

function openTabMenu(e: MouseEvent, sheetId: string): void {
  props.sheet?.switchSheet(sheetId)
  activeSheetId.value = sheetId
  const payload = {
    sheetId,
    clientX: e.clientX,
    clientY: e.clientY,
    close: closeTabMenu,
  }
  tabMenu.value = { show: true, ...payload }
  emit('tab-menu', payload)
}

function onSwitchSheet(id: string): void {
  props.sheet?.switchSheet(id)
  activeSheetId.value = id
}

function onAddSheet(): void {
  const id = props.sheet?.addSheet()
  if (id) {
    activeSheetId.value = id
    emit('add-sheet', id)
  }
}

function onDragEnd(): void {
  const ids = tabItems.value.map((t) => t.id)
  props.sheet?.reorderSheets(ids)
}

defineExpose({ rootEl })
</script>

<template>
  <div class="sheet-bar" ref="rootEl">
    <Draggable
      v-model="tabItems"
      item-key="id"
      class="sheet-tabs-draggable"
      handle=".sheet-tab-drag-handle"
      :animation="150"
      ghost-class="sheet-tab-ghost"
      @end="onDragEnd"
    >
      <template #item="{ element: tab }">
        <div
          class="sheet-tab"
          :class="{ active: tab.id === activeSheetId }"
          :style="tabAccentStyle(tab)"
          @click="onSwitchSheet(tab.id)"
          @contextmenu.prevent="openTabMenu($event, tab.id)"
        >
          <span class="sheet-tab-drag-handle sheet-tab-label">{{ tab.label }}</span>
          <a-button
            v-if="tab.id === activeSheetId"
            type="text"
            size="small"
            class="sheet-tab-menu-btn"
            @click.stop="openTabMenu($event, tab.id)"
          >
            <CaretDownOutlined />
          </a-button>
        </div>
      </template>
    </Draggable>
    <a-button
      type="text"
      size="small"
      class="sheet-tab-add"
      aria-label="新建工作表"
      @click="onAddSheet"
    >
      <PlusOutlined />
    </a-button>
    <slot
      v-if="tabMenu.show && $slots['tab-menu']"
      name="tab-menu"
      :sheet-id="tabMenu.sheetId"
      :client-x="tabMenu.clientX"
      :client-y="tabMenu.clientY"
      :close="closeTabMenu"
    />
  </div>
</template>

<style scoped src="./sheet-chrome.less"></style>

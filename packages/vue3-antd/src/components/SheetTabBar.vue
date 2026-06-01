<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, toRef, watch } from 'vue'
import {
  PlusOutlined,
  CaretDownOutlined,
  UnorderedListOutlined,
  HolderOutlined,
  CheckOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'
import draggable from 'vuedraggable'
import type { Sheet } from '@speed-sheet/core'
import type { SpeedSheetProps } from '../types'
import SheetTabContextMenu from '../menus/sheetTabMenu/index.vue'
import { useSheetLocale } from '../composables/useSheetLocale'

export interface SheetTabItem {
  id: string
  label: string
  color: string | null
}

import type { SheetTabMenuItemConfig } from '../menus/sheetTabMenu/types'

const props = withDefaults(
  defineProps<{
    sheet: Sheet | null
    revision: number
    editable?: boolean
    lang?: SpeedSheetProps['lang']
    menuKeys?: SheetTabMenuItemConfig[]
    excludeMenuKeys?: string[]
  }>(),
  {
    lang: 'zh',
    editable: true,
  },
)

const { t } = useSheetLocale(() => props.lang)

const emit = defineEmits<{
  'add-sheet': [sheetId: string]
}>()

const flexRef = ref<{ $el: HTMLElement } | null>(null)
const tabsViewportRef = ref<HTMLElement | null>(null)
const sheetListOpen = ref(false)
const tabsOverflow = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
/** 当前打开页签菜单的 sheetId，对齐 a-dropdown v-model:open */
const menuOpenSheetId = ref<string | null>(null)
/** 高级拾色器打开时阻止 dropdown 误关 */
const menuPickerOpen = ref(false)

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

function updateTabScrollState(): void {
  const el = tabsViewportRef.value
  if (!el) {
    tabsOverflow.value = false
    canScrollLeft.value = false
    canScrollRight.value = false
    return
  }
  const { scrollLeft, scrollWidth, clientWidth } = el
  const overflow = scrollWidth > clientWidth + 1
  tabsOverflow.value = overflow
  canScrollLeft.value = overflow && scrollLeft > 1
  canScrollRight.value = overflow && scrollLeft + clientWidth < scrollWidth - 1
}

function scrollTabs(direction: -1 | 1): void {
  const el = tabsViewportRef.value
  if (!el) return
  const step = Math.max(120, Math.floor(el.clientWidth * 0.55))
  el.scrollBy({ left: direction * step, behavior: 'smooth' })
}

function scrollActiveTabIntoView(): void {
  const viewport = tabsViewportRef.value
  if (!viewport) return
  const active = viewport.querySelector<HTMLElement>('.sheet-tab.active')
  active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const el = tabsViewportRef.value
  if (!el) return
  resizeObserver = new ResizeObserver(() => {
    updateTabScrollState()
  })
  resizeObserver.observe(el)
  updateTabScrollState()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  () => [props.revision, props.sheet] as const,
  () => {
    tabItems.value = buildTabs()
    activeSheetId.value = sheetRef.value?.getActiveSheetId() ?? ''
    nextTick(() => {
      updateTabScrollState()
      scrollActiveTabIntoView()
    })
  },
  { immediate: true },
)

watch(activeSheetId, () => {
  nextTick(scrollActiveTabIntoView)
})

function tabAccentStyle(tab: SheetTabItem): Record<string, string> {
  if (!tab.color) return {}
  return { borderBottomColor: tab.color }
}

function isMenuOpen(tabId: string): boolean {
  return menuOpenSheetId.value === tabId
}

function onMenuOpenChange(tabId: string, open: boolean): void {
  if (open) {
    props.sheet?.switchSheet(tabId)
    activeSheetId.value = tabId
    menuOpenSheetId.value = tabId
    return
  }
  // 拾色器仍打开时忽略 dropdown 的关闭（第二次点「更多颜色」）
  if (menuPickerOpen.value) return
  if (menuOpenSheetId.value === tabId) {
    menuOpenSheetId.value = null
  }
}

function onPickerOpenChange(open: boolean): void {
  menuPickerOpen.value = open
}

function openTabMenu(tabId: string): void {
  if (!props.editable) return
  props.sheet?.switchSheet(tabId)
  activeSheetId.value = tabId
  menuOpenSheetId.value = tabId
}

function onSwitchSheet(id: string): void {
  props.sheet?.switchSheet(id)
  activeSheetId.value = id
}

function onSwitchFromList(id: string): void {
  onSwitchSheet(id)
  sheetListOpen.value = false
}

function onAddSheet(): void {
  if (!props.editable) return
  const id = props.sheet?.addSheet()
  if (id) {
    activeSheetId.value = id
    emit('add-sheet', id)
  }
}

function onDragEnd(): void {
  if (!props.editable) return
  const ids = tabItems.value.map((t) => t.id)
  props.sheet?.reorderSheets(ids)
  nextTick(updateTabScrollState)
}

defineExpose({
  get rootEl(): HTMLElement | undefined {
    return flexRef.value?.$el
  },
})
</script>

<template>
  <a-flex ref="flexRef" class="sheet-bar" align="center" :gap="0">
    <a-popover
      v-model:open="sheetListOpen"
      trigger="click"
      placement="topLeft"
      :overlay-inner-style="{ padding: 0 }"
      overlay-class-name="sheet-tab-list-popover"
    >
      <template #content>
        <draggable
          v-model="tabItems"
          item-key="id"
          tag="ul"
          class="sheet-tab-list"
          handle=".sheet-tab-list-drag"
          :disabled="!editable"
          :animation="150"
          ghost-class="sheet-tab-list-ghost"
          @end="onDragEnd"
        >
          <template #item="{ element: tab }">
            <li
              class="sheet-tab-list-item"
              :class="{ active: tab.id === activeSheetId }"
              @click="onSwitchFromList(tab.id)"
            >
              <HolderOutlined class="sheet-tab-list-drag" />
              <span class="sheet-tab-list-label">{{ tab.label }}</span>
              <CheckOutlined
                v-if="tab.id === activeSheetId"
                class="sheet-tab-list-check"
              />
            </li>
          </template>
        </draggable>
      </template>
      <a-button
        type="text"
        size="small"
        class="sheet-tab-menu-btn"
        :aria-label="t('sheetTabBar.sheetList')"
      >
        <UnorderedListOutlined />
      </a-button>
    </a-popover>

    <!-- 语雀 sheet-list：中间可滚动页签区 -->
    <div class="sheet-list">
      <div class="sheet-tab-strip">
        <div
          v-show="tabsOverflow"
          class="sheet-tab-arrow-container"
          :class="{ disabled: !canScrollLeft }"
        >
          <button
            type="button"
            class="sheet-tab-arrow"
            :aria-label="t('sheetTabBar.scrollLeft')"
            :disabled="!canScrollLeft"
            @click="scrollTabs(-1)"
          >
            <LeftOutlined />
          </button>
        </div>

        <div
          ref="tabsViewportRef"
          class="sheet-tab-container"
          @scroll.passive="updateTabScrollState"
        >
        <draggable
          v-model="tabItems"
          item-key="id"
          class="sheet-tabs-draggable"
          handle=".sheet-tab-drag-handle"
          :disabled="!editable"
          :animation="150"
          ghost-class="sheet-tab-ghost"
          @end="onDragEnd"
        >
          <template #item="{ element: tab }">
            <div
              class="sheet-tab"
              :class="{ active: tab.id === activeSheetId }"
              :style="tabAccentStyle(tab)"
              @contextmenu.prevent="openTabMenu(tab.id)"
            >
              <span
                :class="[
                  'sheet-tab-label',
                  editable ? 'sheet-tab-drag-handle' : 'sheet-tab-label-readonly',
                ]"
                @click="onSwitchSheet(tab.id)"
              >
                {{ tab.label }}
              </span>
              <a-dropdown
                v-if="editable"
                :open="isMenuOpen(tab.id)"
                :trigger="['click']"
                placement="topLeft"
                :destroy-popup-on-hide="false"
                overlay-class-name="sheet-tab-menu-dropdown-overlay"
                @update:open="(open: boolean) => onMenuOpenChange(tab.id, open)"
              >
                <span
                  class="sheet-tab-caret-trigger"
                  role="button"
                  :aria-label="t('sheetTabBar.tabMenu')"
                  @click.stop
                >
                  <CaretDownOutlined />
                </span>
                <template #overlay>
                  <SheetTabContextMenu
                    :sheet-id="tab.id"
                    :sheet="sheet"
                    :lang="lang"
                    :menu-keys="menuKeys"
                    :exclude-keys="excludeMenuKeys"
                    @picker-open-change="onPickerOpenChange"
                    @close="menuOpenSheetId = null; menuPickerOpen = false"
                  />
                </template>
              </a-dropdown>
            </div>
          </template>
        </draggable>
        </div>

        <div
          v-show="tabsOverflow"
          class="sheet-tab-arrow-container"
          :class="{ disabled: !canScrollRight }"
        >
          <button
            type="button"
            class="sheet-tab-arrow"
            :aria-label="t('sheetTabBar.scrollRight')"
            :disabled="!canScrollRight"
            @click="scrollTabs(1)"
          >
            <RightOutlined />
          </button>
        </div>
      </div>
    </div>

    <a-button
      v-if="editable"
      type="text"
      size="small"
      class="sheet-tab-add-btn insert-sheet-tab"
      :aria-label="t('sheetTabBar.addSheet')"
      @click="onAddSheet"
    >
      <PlusOutlined />
    </a-button>
  </a-flex>
</template>

<style scoped lang="less">
.sheet-bar {
  width: 100%;
  height: var(--speed-layout-sheet-bar-height, 32px);
  min-height: var(--speed-layout-sheet-bar-height, 32px);
  max-height: var(--speed-layout-sheet-bar-height, 32px);
  flex-shrink: 0;
  padding-left: 12px;
  border-top: 1px solid var(--speed-color-border-gray, var(--ant-color-border));
  background: var(--speed-color-bg-gray, var(--ant-color-fill-quaternary));
  overflow: hidden;
}

.sheet-tab-menu-btn,
.sheet-tab-add-btn {
  flex-shrink: 0;
  width: 40px;
  height: var(--speed-layout-sheet-bar-height, 32px);
  padding: 0 !important;
  border-radius: 0;
  &:hover {
    color: var(--ant-color-primary) !important;
  }
}

/* 语雀 .sheet-list */
.sheet-list {
  min-width: 0;
  max-width: calc(100% - var(--speed-layout-sheet-tabbar-chrome-width, 80px));
  height: var(--speed-layout-sheet-bar-height, 32px);
  padding-left: 0;
  overflow: hidden;
}

/* 语雀 .lake-tab */
.sheet-tab-strip {
  display: flex;
  align-items: center;
  height: 100%;
  min-width: 0;
}

.sheet-tab-arrow-container {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 100%;

  &.disabled .sheet-tab-arrow {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.sheet-tab-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: var(--ant-border-radius-sm);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  transition: color var(--ant-motion-duration-mid), background var(--ant-motion-duration-mid);

  &:hover:not(:disabled) {
    color: var(--ant-color-primary);
    background: var(--speed-color-bg-gray-1, var(--ant-color-fill-quaternary));
  }

  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

/* 语雀 .lake-tab-container */
.sheet-tab-container {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.sheet-tabs-draggable {
  display: inline-flex;
  align-items: center;
  width: max-content;
  height: 100%;
}

.sheet-tab {
  display: inline-flex;
  height: 100%;
  align-items: center;
  padding: 0 4px 0 12px;
  cursor: pointer;
  white-space: nowrap;
  font-size: var(--ant-font-size-sm);
  line-height: 1;
  border-right: 1px solid var(--ant-color-border);
  border-bottom: 2px solid transparent;
  flex-shrink: 0;
  &:first-child {
    border-left: 1px solid var(--ant-color-border);
  }
  transition:
    background var(--ant-motion-duration-mid),
    color var(--ant-motion-duration-mid),
    border-color var(--ant-motion-duration-mid);

  &:hover {
    background: var(--speed-color-bg-gray-1, var(--ant-color-fill-quaternary));
    color: var(--ant-color-primary);
  }

  &.active {
    background: var(--ant-color-bg-container);
    font-weight: 500;
    color: var(--ant-color-primary);
    border-bottom-color: var(--ant-color-primary);
  }
}

.sheet-tab-drag-handle {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.sheet-tab-label {
  pointer-events: auto;
}

.sheet-tab-caret-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 4px;
  color: var(--ant-color-text-tertiary);
  border-radius: 2px;

  &:hover {
    color: var(--ant-color-primary);
    background: var(--speed-color-bg-gray-1, var(--ant-color-fill-quaternary));
  }
}

.sheet-tab-ghost {
  opacity: 0.45;
  background: var(--ant-color-primary-bg) !important;
}


</style>

<style lang="less">
.sheet-tab-list-popover {
  --speed-layout-sheet-tab-list-max-height: 280px;

  .ant-popover-inner-content {
    padding: 0;
  }
}

.sheet-tab-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  min-width: 168px;
  max-height: var(--speed-layout-sheet-tab-list-max-height, 280px);
  overflow-y: auto;
}

.sheet-tab-list-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: var(--ant-font-size-sm);
  line-height: 1.4;
  transition: background var(--ant-motion-duration-mid);

  &:hover {
    background: var(--speed-color-bg-gray-1, var(--ant-color-fill-quaternary));
  }

  &.active {
    color: var(--ant-color-primary);
  }
}

.sheet-tab-list-drag {
  flex-shrink: 0;
  color: var(--ant-color-text-tertiary);
  font-size: 12px;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.sheet-tab-list-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-tab-list-check {
  flex-shrink: 0;
  color: var(--ant-color-text-tertiary);
  font-size: 12px;
}

.sheet-tab-list-ghost {
  opacity: 0.5;
  background: var(--ant-color-primary-bg);
}

.sheet-tab-menu-dropdown-overlay {
  .ant-dropdown-menu {
    padding: 4px 0;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
}
</style>

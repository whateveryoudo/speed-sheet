<script setup lang="ts">
import { computed, reactive, toRef, watch } from 'vue'
import type { ContextMenuTarget } from '../../types'
import type { Sheet } from '@speed-sheet/core'
import type { ContextMenuItemConfig, SpeedSheetProps } from '../../types'
import { useContextMenuFloating } from '../../composables/useContextMenuFloating'
import { buildContextMenuItems } from './buildItems'
import {
  runContextMenuAction,
  type ContextMenuActionContext,
} from './registry'
import { useSheetLocale } from '../../composables/useSheetLocale'
import { selectionColCount, selectionRowCount } from './format'

defineOptions({ name: 'CellContextMenu' })

const props = withDefaults(
  defineProps<{
    open?: boolean
    clientX?: number
    clientY?: number
    r?: number
    c?: number
    target?: ContextMenuTarget
    sheet?: Sheet | null
    lang?: SpeedSheetProps['lang']
    menuKeys?: ContextMenuItemConfig[]
    excludeKeys?: string[]
    boundary?: HTMLElement | null
  }>(),
  {
    open: false,
    clientX: 0,
    clientY: 0,
    r: 0,
    c: 0,
    target: 'cell',
    lang: 'zh',
  },
)

const emit = defineEmits<{
  close: []
}>()

const boundaryRef = toRef(() => props.boundary)
const { visible, menuEl, openAt, close } = useContextMenuFloating({
  boundary: boundaryRef,
})

const insertCounts = reactive({
  insertRowAbove: 1,
  insertRowBelow: 1,
  insertColLeft: 1,
  insertColRight: 1,
})

const actionCtx = computed<ContextMenuActionContext>(() => ({
  sheet: props.sheet,
  selection: props.sheet?.state.getSelection(),
  r: props.r ?? 0,
  c: props.c ?? 0,
  target: props.target ?? 'cell',
  close: () => {
    close()
    emit('close')
  },
}))

const { t } = useSheetLocale(() => props.lang)

const items = computed(() =>
  buildContextMenuItems(actionCtx.value, t),
)

function syncInsertCounts(): void {
  const sel = props.sheet?.state.getSelection()
  if (!sel) return
  const rc = selectionRowCount(sel)
  const cc = selectionColCount(sel)
  insertCounts.insertRowAbove = rc
  insertCounts.insertRowBelow = rc
  insertCounts.insertColLeft = cc
  insertCounts.insertColRight = cc
}

watch(
  () => [props.open, props.clientX, props.clientY, props.target, props.sheet] as const,
  async ([open, x, y]) => {
    if (open) {
      syncInsertCounts()
      await openAt(x, y)
    } else {
      close()
    }
  },
  { immediate: true },
)

function onMenuClick({ key }: { key: string | number }): void {
  const k = String(key)
  // Insert / merge 项有独立 @click，避免执行两次
  if (k.startsWith('insert') || k === 'mergeCells' || k === 'unmergeCells') return
  runContextMenuAction(k, [], actionCtx.value)
}

function onInsert(key: keyof typeof insertCounts): void {
  runContextMenuAction(key, [], actionCtx.value, {
    count: insertCounts[key],
  })
}

function insertCount(key: string): number {
  return insertCounts[key as keyof typeof insertCounts] ?? 1
}

function setInsertCount(key: string, val: number | null): void {
  const k = key as keyof typeof insertCounts
  if (k in insertCounts) {
    insertCounts[k] = Math.max(1, val ?? 1)
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" ref="menuEl"
      class="bg-white rounded-6px shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-[#d0d0d0] min-w-200px overflow-hidden"
      @mousedown.prevent @contextmenu.prevent>
      <a-menu class="cell-ctx-menu-inner border-none! shadow-none!" @click="onMenuClick">
        <template v-for="(item, idx) in items" :key="idx">
          <a-menu-divider v-if="item.type === 'divider'" />
          <a-menu-item v-else-if="item.type === 'insert'" :key="item.key"
            class="cell-ctx-insert-item flex! items-center gap-1.5"
            @click.stop="onInsert(item.key as keyof typeof insertCounts)">
            <a-flex align="center">
              <span class="w-[20px] shrink-0">
                <s-icon-font v-if="item.prefixIcon" :icon-render="item.prefixIcon" />
              </span>
              <span class="flex-1 min-w-0">{{ item.label }}</span>
              <a-input-number :value="insertCount(item.key)" size="small" :min="1" :max="999"
                class="cell-ctx-insert-input w-52px! flex-shrink-0 mx-1" @click.stop @mousedown.stop
                @update:value="(v: number | null) => setInsertCount(item.key, v)" />
              <span class="flex-shrink-0 text-12px text-[var(--ant-color-text-tertiary,#999)]">
                {{ item.unit }}
              </span>
            </a-flex>
          </a-menu-item>
          <a-menu-item
            v-else-if="item.type === 'merge'"
            :key="item.key"
            :disabled="item.disabled"
            @click.stop="runContextMenuAction(item.key, [], actionCtx)"
          >
            <a-flex align="center">
              <span class="shrink-0 w-[20px]" v-if="item.prefixIcon && item.prefixIcon()">
                <s-icon-font :icon-render="item.prefixIcon" />
              </span>
              {{ item.title }}
            </a-flex>
          </a-menu-item>
          <a-menu-item v-else :key="item.key" :disabled="item.disabled">
            <a-flex align="center" justify="space-between">
              <span class="flex items-center min-w-0 flex-1">
                <span class="shrink-0 w-[20px]" v-if="item.prefixIcon && item.prefixIcon()">
                  <s-icon-font :icon-render="item.prefixIcon" />
                </span>
                <span class="flex-1">{{ item.title }}</span>
              </span>
              <span v-if="item.shortcut"
                class="flex-shrink-0 text-12px text-[var(--ant-color-text-tertiary,#999)] tracking-wide">
                {{ item.shortcut }}
              </span>
            </a-flex>

          </a-menu-item>
        </template>
      </a-menu>
    </div>
  </Teleport>
</template>

<style scoped>
/* ant-menu 内部结构需 :deep，其余布局已用 UnoCSS */
:deep(.cell-ctx-menu-inner .ant-menu-item) {
  height: 32px;
  line-height: 32px;
  padding-left: 10px;
}

:deep(.cell-ctx-insert-input .ant-input-number-handler-wrap) {
  display: none;
}

:deep(.cell-ctx-insert-input .ant-input-number-input) {
  padding: 0 4px;
  text-align: center;
}
</style>

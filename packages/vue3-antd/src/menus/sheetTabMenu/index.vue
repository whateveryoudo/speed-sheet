<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import { Menu } from 'ant-design-vue'
import type { Sheet } from '@speed-sheet/core'
import type { SpeedSheetProps } from '../../types'
import { useContextMenuFloating } from '../../composables/useContextMenuFloating'
import type { SheetTabMenuItemConfig } from './types'
import {
  processSheetTabMenuKeys,
  resolveSheetTabMenuKeys,
  runSheetTabMenuAction,
} from './registry'

defineOptions({ name: 'SheetTabContextMenu' })

const props = withDefaults(
  defineProps<{
    open?: boolean
    clientX?: number
    clientY?: number
    sheetId?: string
    sheet?: Sheet | null
    lang?: SpeedSheetProps['lang']
    menuKeys?: SheetTabMenuItemConfig[]
    excludeKeys?: string[]
    boundary?: HTMLElement | null
  }>(),
  {
    open: false,
    clientX: 0,
    clientY: 0,
    sheetId: '',
    lang: 'zh',
  },
)

const emit = defineEmits<{ close: [] }>()

const AMenu = Menu
const AMenuItem = Menu.Item
const AMenuDivider = Menu.Divider
const ASubMenu = Menu.SubMenu

const boundaryRef = toRef(() => props.boundary)
const { visible, menuEl, openAt, close } = useContextMenuFloating({
  boundary: boundaryRef,
})

const resolvedKeys = computed(() =>
  resolveSheetTabMenuKeys(props.menuKeys, props.excludeKeys),
)

const actionCtx = computed(() => ({
  sheet: props.sheet,
  sheetId: props.sheetId ?? '',
  close: () => {
    close()
    emit('close')
  },
}))

const items = computed(() =>
  processSheetTabMenuKeys(resolvedKeys.value, props.lang ?? 'zh', actionCtx.value),
)

watch(
  () => [props.open, props.clientX, props.clientY] as const,
  async ([open, x, y]) => {
    if (open) await openAt(x, y)
    else close()
  },
  { immediate: true },
)

function onMenuClick({ key }: { key: string | number }): void {
  runSheetTabMenuAction(String(key), resolvedKeys.value, actionCtx.value)
}

function onColorPick(color: string): void {
  runSheetTabMenuAction('tabColor', resolvedKeys.value, actionCtx.value, color)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" ref="menuEl" class="sheet-tab-ctx-menu" @mousedown.prevent>
      <a-menu class="sheet-tab-ctx-menu-inner" @click="onMenuClick">
        <template v-for="(item, idx) in items" :key="idx">
          <a-menu-divider v-if="item.type === 'divider'" />
          <a-sub-menu
            v-else-if="item.type === 'color-submenu'"
            :key="item.key"
            :title="item.title"
          >
            <a-menu-item
              v-for="color in item.colors"
              :key="color"
              @click="onColorPick(color)"
            >
              <span class="sheet-tab-color-swatch" :style="{ background: color }" />
            </a-menu-item>
          </a-sub-menu>
          <a-menu-item v-else :key="item.key" :disabled="item.disabled">
            {{ item.title }}
          </a-menu-item>
        </template>
      </a-menu>
    </div>
  </Teleport>
</template>

<style scoped>
.sheet-tab-ctx-menu {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid #d0d0d0;
  min-width: 180px;
  overflow: hidden;
}
.sheet-tab-ctx-menu-inner {
  border: none !important;
  box-shadow: none !important;
}
.sheet-tab-ctx-menu-inner :deep(.ant-menu-item) {
  height: 32px;
  line-height: 32px;
}
.sheet-tab-color-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  vertical-align: middle;
}
</style>

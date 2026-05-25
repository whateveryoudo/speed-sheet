<script setup lang="ts">
import { computed, toRef, watch } from 'vue'
import { Menu } from 'ant-design-vue'
import type { Sheet } from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'
import type { ContextMenuItemConfig, SpeedSheetProps } from '../../types'
import { useContextMenuFloating } from '../../composables/useContextMenuFloating'
import {
  processContextMenuKeys,
  resolveContextMenuKeys,
  runContextMenuAction,
  type ContextMenuActionContext,
} from './registry'

defineOptions({ name: 'CellContextMenu' })

const props = withDefaults(
  defineProps<{
    open?: boolean
    clientX?: number
    clientY?: number
    r?: number
    c?: number
    sheet?: Sheet | null
    selection?: Selection
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
    lang: 'zh',
  },
)

const emit = defineEmits<{
  close: []
}>()

const AMenu = Menu
const AMenuItem = Menu.Item
const AMenuDivider = Menu.Divider

const boundaryRef = toRef(() => props.boundary)
const { visible, menuEl, openAt, close } = useContextMenuFloating({
  boundary: boundaryRef,
})

const resolvedKeys = computed(() =>
  resolveContextMenuKeys(props.menuKeys, props.excludeKeys),
)

const actionCtx = computed<ContextMenuActionContext>(() => ({
  sheet: props.sheet,
  selection: props.selection,
  r: props.r ?? 0,
  c: props.c ?? 0,
  close: () => {
    close()
    emit('close')
  },
}))

const items = computed(() =>
  processContextMenuKeys(resolvedKeys.value, props.lang ?? 'zh', actionCtx.value),
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
  runContextMenuAction(String(key), resolvedKeys.value, actionCtx.value)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" ref="menuEl" class="cell-ctx-menu" @mousedown.prevent>
      <a-menu class="cell-ctx-menu-inner" @click="onMenuClick">
        <template v-for="(item, idx) in items" :key="idx">
          <a-menu-divider v-if="item.type === 'divider'" />
          <a-menu-item v-else :key="item.key" :disabled="item.disabled">
            {{ item.title }}
          </a-menu-item>
        </template>
      </a-menu>
    </div>
  </Teleport>
</template>

<style scoped>
.cell-ctx-menu {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border: 1px solid #d0d0d0;
  min-width: 160px;
  overflow: hidden;
}
.cell-ctx-menu-inner {
  border: none !important;
  box-shadow: none !important;
}
.cell-ctx-menu-inner :deep(.ant-menu-item) {
  height: 32px;
  line-height: 32px;
}
</style>

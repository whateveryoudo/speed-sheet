<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import type { MenuProps } from 'ant-design-vue'
import { useSheetYMap } from '@speed-sheet/vue3'
import type { Sheet } from '@speed-sheet/core'
import type { SpeedSheetProps } from '../../types'
import ColorBoard from '../toolbar/colorPicker/ColorBoard.vue'
import type { ColorType } from '../toolbar/colorPicker/data'
import type { SheetTabMenuItemConfig } from './types'
import { useSheetLocale } from '../../composables/useSheetLocale'
import {
  processSheetTabMenuKeys,
  resolveSheetTabMenuKeys,
  runSheetTabMenuAction,
} from './registry'

defineOptions({ name: 'SheetTabContextMenu' })

const props = withDefaults(
  defineProps<{
    sheetId: string
    sheet?: Sheet | null
    lang?: SpeedSheetProps['lang']
    menuKeys?: SheetTabMenuItemConfig[]
    excludeKeys?: string[]
  }>(),
  {
    sheetId: '',
    lang: 'zh',
  },
)

const emit = defineEmits<{
  close: []
  'picker-open-change': [open: boolean]
}>()

const pickerOpen = ref(false)
const openKeys = ref<string[]>(['tabColor'])

const resolvedKeys = computed(() =>
  resolveSheetTabMenuKeys(props.menuKeys, props.excludeKeys),
)

function dismissMenu(): void {
  emit('close')
}

const actionCtx = computed(() => ({
  sheet: props.sheet,
  sheetId: props.sheetId,
  close: dismissMenu,
}))

const { t } = useSheetLocale(() => props.lang)

const items = computed(() =>
  processSheetTabMenuKeys(resolvedKeys.value, t, actionCtx.value),
)

const sheetMeta = useSheetYMap(
  toRef(() => props.sheet ?? null),
  toRef(() => props.sheetId),
  { color: '' },
)

const onMenuClick: MenuProps['onClick'] = (e) => {
  const key = String(e.key)
  if (key === 'tabColor-board' || key === 'tabColor') return
  runSheetTabMenuAction(key, resolvedKeys.value, actionCtx.value)
}

function onColorPick(color: ColorType): void {
  runSheetTabMenuAction(
    'tabColor',
    resolvedKeys.value,
    actionCtx.value,
    color === null ? null : String(color),
  )
}
// 增加挂载容器配置（color拾色器需要挂载在submenu内部）
function getPopupContainer(trigger: HTMLElement): HTMLElement {
  return (
    trigger.closest('.sheet-tab-color-submenu-popup') ??
    document.body
  )
}

function onPickerOpenChange(open: boolean): void {
  pickerOpen.value = open
  emit('picker-open-change', open)
}

defineExpose({ pickerOpen })
</script>

<template>
  <a-menu v-model:open-keys="openKeys" class="w-[150px]" :selectable="false" @click="onMenuClick">
    <template v-for="(item, idx) in items" :key="idx">
      <a-menu-divider v-if="item.type === 'divider'" :key="`divider-${idx}`" />
      <a-sub-menu v-else-if="item.type === 'color-submenu'" :key="`color-${item.key}`" :title="item.title"
        popup-class-name="sheet-tab-color-submenu-popup">
        <a-menu-item key="tabColor-board" class="sheet-tab-color-picker-item">
          <ColorBoard :cur-color="sheetMeta.color" :clear-label="t('colorBoard.noTabColor')" :get-popup-container="getPopupContainer"
            @pick="onColorPick" @picker-open-change="onPickerOpenChange" @mousedown.stop @click.stop />
        </a-menu-item>
      </a-sub-menu>
      <a-menu-item v-else :key="`item-${item.key}`" :disabled="item.disabled">
        {{ item.title }}
      </a-menu-item>
    </template>
  </a-menu>
</template>

<style lang="less">
.sheet-tab-menu-dropdown-overlay {
  overflow: visible;

  .ant-dropdown-menu.sheet-tab-color-picker-item {
    padding: 0;
    box-shadow: none;
    background: transparent;
  }
}

.sheet-tab-color-submenu-popup {
  .sheet-tab-color-picker-item {
    height: auto !important;
    line-height: normal !important;
    padding: 0 !important;
    margin: 0 !important;
    cursor: default;
    background: transparent !important;

    &:hover,
    &.ant-menu-item-active {
      background: transparent !important;
    }
  }

  .ant-menu-sub {
    min-width: 0;
    padding: 0;
  }
}
</style>

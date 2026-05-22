<template>
  <div class="tb">
    <a-space :size="0">
      <!-- Undo / Redo -->
      <a-button size="small" type="text" @click="onUndo" title="Undo"><UndoOutlined /></a-button>
      <a-button size="small" type="text" @click="onRedo" title="Redo"><RedoOutlined /></a-button>
    </a-space>

    <a-divider type="vertical" />

    <!-- Bold / Italic / Underline / Strikethrough -->
    <a-space :size="1">
      <a-button size="small" :type="isBold ? 'primary' : 'text'" @click="onBold"><b>B</b></a-button>
      <a-button size="small" :type="isItalic ? 'primary' : 'text'" @click="onItalic"><i>I</i></a-button>
      <a-button size="small" type="text"><u>U</u></a-button>
      <a-button size="small" type="text"><s>S</s></a-button>
    </a-space>

    <a-divider type="vertical" />

    <!-- Font size -->
    <a-select
      size="small"
      :value="activeFontSize"
      style="width: 64px"
      :options="fontSizeOptions"
      @change="onFontSize"
      placeholder="Size"
    />

    <a-divider type="vertical" />

    <!-- Colors -->
    <a-space :size="2">
      <a-tooltip title="Font color">
        <span class="color-btn">
          <span class="color-label">A</span>
          <input type="color" @input="onFontColor" class="color-picker" value="#333333" />
        </span>
      </a-tooltip>
      <a-tooltip title="Fill color">
        <span class="color-btn">
          <BgColorsOutlined style="font-size:12px" />
          <input type="color" @input="onBgColor" class="color-picker" value="#ffffff" />
        </span>
      </a-tooltip>
    </a-space>

    <a-divider type="vertical" />

    <!-- Merge -->
    <a-button size="small" type="text" title="Merge cells">
      <template #icon><BorderOutlined /></template>
    </a-button>

    <a-divider type="vertical" />

    <!-- Align -->
    <a-space :size="1">
      <a-button size="small" type="text" title="Align left"><AlignLeftOutlined /></a-button>
      <a-button size="small" type="text" title="Align center"><AlignCenterOutlined /></a-button>
      <a-button size="small" type="text" title="Align right"><AlignRightOutlined /></a-button>
    </a-space>

    <a-divider type="vertical" />

    <!-- Number format -->
    <a-select
      size="small"
      style="width: 90px"
      :options="formatOptions"
      placeholder="General"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Button, Select, Divider, Space, Tooltip,
} from 'ant-design-vue'
import {
  UndoOutlined, RedoOutlined, BgColorsOutlined,
  BorderOutlined, AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
} from '@ant-design/icons-vue'

const AButton = Button
const ASelect = Select
const ADivider = Divider
const ASpace = Space
const ATooltip = Tooltip

const props = defineProps<{
  sheet?: any
  selection?: { row: [number, number]; column: [number, number] }
  cells?: Array<{ r: number; c: number; data: any }>
}>()

const cellMap = computed(() => {
  const m = new Map<string, any>()
  if (props.cells) for (const { r, c, data } of props.cells) m.set(`${r}_${c}`, data)
  return m
})
const activeCell = computed(() => {
  if (!props.selection) return null
  return cellMap.value.get(`${props.selection.row[0]}_${props.selection.column[0]}`) ?? null
})
const isBold = computed(() => activeCell.value?.bl === 1)
const isItalic = computed(() => activeCell.value?.it === 1)
const activeFontSize = computed(() => activeCell.value?.fs ?? undefined)

const fontSizeOptions = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map(s => ({ value: s, label: String(s) }))
const formatOptions = [
  { value: 'General', label: 'General' },
  { value: '0', label: 'Number' },
  { value: '0.00', label: 'Decimal' },
  { value: '#,##0', label: 'Accounting' },
  { value: '@', label: 'Text' },
]

function rc() { return { r: props.selection?.row[0] ?? 0, c: props.selection?.column[0] ?? 0 } }

function onBold() { props.sheet?.chain().setBold(rc()).run() }
function onItalic() { props.sheet?.chain().setItalic(rc()).run() }
function onFontSize(v: number) { props.sheet?.chain().setFontSize({ ...rc(), size: v }).run() }
function onFontColor(e: Event) { props.sheet?.chain().setFontColor({ ...rc(), color: (e.target as HTMLInputElement).value }).run() }
function onBgColor(e: Event) { props.sheet?.chain().setBgColor({ ...rc(), color: (e.target as HTMLInputElement).value }).run() }
function onUndo() { props.sheet?.chain().undo().run() }
function onRedo() { props.sheet?.chain().redo().run() }
</script>

<style scoped>
.tb { display: flex; align-items: center; gap: 0; height: 100%; }
.color-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 4px; cursor: pointer; }
.color-btn:hover { background: #e8e8e8; }
.color-label { font-size: 11px; font-weight: 700; color: #444; }
.color-picker { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
</style>

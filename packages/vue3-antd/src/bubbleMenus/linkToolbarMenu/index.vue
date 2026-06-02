<template>
  <BubbleContainer
    :should-show="shouldShow"
    :anchor-rect="anchorRectRef"
    :boundary="boundary"
    placement="bottom-start"
    :offset="2"
  >
    <div class="sheet-link-toolbar" @mousedown.stop>
      <a
        v-if="href"
        class="sheet-link-toolbar__url"
        :href="href"
        target="_blank"
        rel="noopener noreferrer"
        @click.stop
      >{{ displayUrl }}</a>
      <a-space :size="4">
        <a-tooltip title="编辑">
          <span class="sheet-link-toolbar__btn" @click="onEdit">
            <EditOutlined />
          </span>
        </a-tooltip>
        <a-tooltip title="打开">
          <span class="sheet-link-toolbar__btn" @click="onOpen">
            <ExportOutlined />
          </span>
        </a-tooltip>
        <a-tooltip title="复制">
          <span class="sheet-link-toolbar__btn" @click="onCopy">
            <CopyOutlined />
          </span>
        </a-tooltip>
        <a-tooltip title="取消链接">
          <span class="sheet-link-toolbar__btn sheet-link-toolbar__btn--danger" @click="onUnlink">
            <DisconnectOutlined />
          </span>
        </a-tooltip>
      </a-space>
    </div>
  </BubbleContainer>
</template>

<script setup lang="ts">
import { computed, watch, type ComputedRef, type Ref } from 'vue'
import {
  CopyOutlined,
  DisconnectOutlined,
  EditOutlined,
  ExportOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { cellRect } from '@speed-sheet/core'
import type { Extension } from '@speed-sheet/core'
import { useSheetViewport, type SheetBubbleAnchorRect } from '@speed-sheet/vue3'
import { useLinkConfigPanel } from '../../composables/useLinkConfigPanel'
import { useLinkToolbarPanel } from '../../composables/useLinkToolbarPanel'
import BubbleContainer from '../BubbleContainer.vue'

defineProps<{
  extension: Extension
  boundary?: Ref<HTMLElement | null | undefined> | HTMLElement | null | undefined
}>()

const { open, anchor, closeToolbar } = useLinkToolbarPanel()
const { openPanel: openLinkConfig } = useLinkConfigPanel()
const { sheet, revision, layout, scrollX, scrollY, viewportTick } = useSheetViewport()

const rule = computed(() => {
  void revision.value
  const s = sheet.value
  if (!s) return null
  return s.state.getDataVerification(anchor.r, anchor.c)
})

const href = computed(() => {
  const addr = rule.value?.linkAddress?.trim()
  if (!addr) return ''
  if (/^https?:\/\//i.test(addr)) return addr
  return `https://${addr}`
})

const displayUrl = computed(() => {
  const u = href.value
  if (!u) return ''
  try {
    const { hostname } = new URL(u)
    return hostname || u
  } catch {
    return u
  }
})

const anchorRectRef = computed((): SheetBubbleAnchorRect | null => {
  void revision.value
  void viewportTick.value
  const s = sheet.value
  if (!s || !open.value) return null
  const { r, c } = anchor
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
  open.value && !!sheet.value && !!anchorRectRef.value && rule.value?.type === 'link'

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
      ar: anchor.r,
      ac: anchor.c,
    }
  },
  (sel) => {
    if (!sel || !open.value) return
    const single = sel.r0 === sel.r1 && sel.c0 === sel.c1
    if (!single || sel.r0 !== sel.ar || sel.c0 !== sel.ac) closeToolbar()
  },
)

function onEdit(): void {
  const { r, c } = anchor
  closeToolbar()
  openLinkConfig({ r, c })
}

function onOpen(): void {
  if (!href.value) return
  window.open(href.value, '_blank', 'noopener,noreferrer')
}

async function onCopy(): Promise<void> {
  const url = rule.value?.linkAddress ?? href.value
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    message.success('已复制链接')
  } catch {
    message.error('复制失败')
  }
}

function onUnlink(): void {
  const s = sheet.value
  if (!s) return
  const { r, c } = anchor
  s.chain().removeLink({ r, c }).run()
  closeToolbar()
}
</script>

<style scoped lang="less">
.sheet-link-toolbar {
  display: flex;
  align-items: center;
  gap: var(--ant-size-sm, 12px);
  max-width: 360px;
}

.sheet-link-toolbar__url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ant-color-primary);
  font-size: var(--ant-font-size);
}

.sheet-link-toolbar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--ant-border-radius-sm);
  cursor: pointer;
  color: var(--ant-color-text);
  transition: background var(--ant-motion-duration-mid);

  &:hover {
    background: var(--ant-control-item-bg-hover);
  }

  &--danger:hover {
    color: var(--ant-color-error);
  }
}
</style>

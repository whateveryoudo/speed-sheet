<template>
  <a-dropdown
    v-model:open="open"
    :trigger="['click']"
    :disabled="!editableCpt"
    overlay-class-name="sheet-freeze-dropdown"
  >
    <s-keymap-tip :title="editableCpt ? '冻结' : null">
      <a-button
        type="text"
        :class="['shadow-btn-wrapper', freezeActive ? 'is-active' : '']"
        :disabled="!editableCpt"
      >
        <BorderOutlined />
        <CaretDownOutlined class="freeze-caret" />
      </a-button>
    </s-keymap-tip>
    <template #overlay>
      <a-menu @click="onMenuClick">
        <template v-if="!freezeActive">
          <a-menu-item key="rows">
            <span class="freeze-menu-item">
              <MenuUnfoldOutlined />
              <span>{{ rowLabel }}</span>
            </span>
          </a-menu-item>
          <a-menu-item key="cols">
            <span class="freeze-menu-item">
              <MenuFoldOutlined />
              <span>{{ colLabel }}</span>
            </span>
          </a-menu-item>
          <a-menu-item key="both">
            <span class="freeze-menu-item">
              <BorderOutlined />
              <span>{{ bothLabel }}</span>
            </span>
          </a-menu-item>
        </template>
        <template v-else>
          <a-menu-divider />
          <a-menu-item key="cancel">
            <span class="freeze-menu-item">
              <CloseOutlined />
              <span>取消冻结</span>
            </span>
          </a-menu-item>
        </template>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Modal, message, type MenuProps } from 'ant-design-vue'
import {
  BorderOutlined,
  CaretDownOutlined,
  CloseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons-vue'
import {
  colToLetter,
  isFreezeActive,
  selectionFreezeTarget,
  validateFreezeInViewport,
  type FreezeMode,
} from '@speed-sheet/core'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const open = ref(false)
const { sheet, revision, editableCpt, selection, getViewportState } = useSheetToolbar()

const freezeActive = computed(() => {
  void revision.value
  const s = sheet.value
  return s ? isFreezeActive(s.state.getFreezeState()) : false
})

const freezeTarget = computed(() => {
  void revision.value
  const sel = selection.value
  if (!sel) return { row: 0, col: 0 }
  return selectionFreezeTarget(sel)
})

const rowLabel = computed(
  () => `冻结至 ${freezeTarget.value.row + 1} 行`,
)
const colLabel = computed(
  () => `冻结至 ${colToLetter(freezeTarget.value.col)} 列`,
)
const bothLabel = computed(
  () => `冻结至 ${freezeTarget.value.row + 1} 行 ${colToLetter(freezeTarget.value.col)} 列`,
)

function showValidationError(reason: 'target_not_visible' | 'region_too_large'): void {
  if (reason === 'target_not_visible') {
    Modal.error({
      title: '操作出错了',
      content: '该行已超过视窗，冻结后不方便查看',
      okText: '知道了',
    })
    return
  }
  Modal.error({
    title: '操作出错了',
    content: '冻结区域超出当前窗口可视范围，冻结线已取消。建议重新设置。',
    okText: '知道了',
  })
}

function applyFreeze(mode: FreezeMode): void {
  const s = sheet.value
  const vp = getViewportState?.()
  if (!s || !vp) return

  const { row, col } = freezeTarget.value
  const result = validateFreezeInViewport({
    layout: { ...vp.layout, freeze: s.state.getFreezeState() },
    metrics: vp.gridMetrics,
    scrollX: vp.scrollX,
    scrollY: vp.scrollY,
    targetRow: row,
    targetCol: col,
    mode,
  })

  if (!result.ok) {
    showValidationError(result.reason)
    return
  }

  s.chain().setFreeze({ xSplit: result.xSplit, ySplit: result.ySplit }).run()
  open.value = false
}

function clearFreeze(): void {
  sheet.value?.chain().clearFreeze().run()
  open.value = false
}

const onMenuClick: MenuProps['onClick'] = ({ key }) => {
  const action = String(key)
  if (action === 'cancel') {
    clearFreeze()
    return
  }
  if (action === 'rows' || action === 'cols' || action === 'both') {
    applyFreeze(action as FreezeMode)
    return
  }
  message.warning('未知操作')
}
</script>

<style scoped lang="less">
.freeze-caret {
  font-size: 10px;
  margin-left: 2px;
  opacity: 0.65;
}

.freeze-menu-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
}
</style>

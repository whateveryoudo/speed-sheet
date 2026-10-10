<template>
  <div
    v-if="visible && btnPos"
    class="sheet-autofill-options-btn-wrap"
    :style="buttonStyle"
    @mousedown.stop
  >
    <a-dropdown
      v-model:open="menuOpen"
      placement="bottomLeft"
      :get-popup-container="getPopupContainer"
    >
      <button
        class="sheet-autofill-options-btn"
        type="button"
        title="自动填充选项"
      >
        <s-icon-font
          type="icon-auto-fill"
          :svg-sprite="true"
          :size="14"
        />
      </button>

      <template #overlay>
        <div class="sheet-autofill-menu-card" @click.stop>
          <div
            v-for="opt in menuOptions"
            :key="opt.key"
            class="sheet-autofill-menu-item"
            :class="{ 'is-selected': selectedMode === opt.key }"
            @click="handleSelect(opt.key)"
          >
            <span class="sheet-autofill-menu-check">
              <CheckOutlined v-if="selectedMode === opt.key" class="sheet-autofill-check-icon" />
            </span>
            <span class="sheet-autofill-menu-label">{{ opt.label }}</span>
          </div>
        </div>
      </template>
    </a-dropdown>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type CSSProperties } from 'vue'
import { CheckOutlined } from '@ant-design/icons-vue'
import {
  selectionBox,
  resolveMetrics,
  type CellRange,
  type AutofillDirection,
  type AutofillMode,
} from '@speed-sheet/core'
import type { CellAttributes } from '@speed-sheet/shared'
import { useSheetViewportOptional } from '@speed-sheet/vue3'
import { ensureSvgSprite } from '../icons'

export interface AutofillPayload {
  sourceRange: CellRange
  targetRange: CellRange
  direction: AutofillDirection
  originalTargetCells?: Array<{ r: number; c: number; cell: CellAttributes | null }>
}

const props = defineProps<{
  lastAutofill: AutofillPayload | null
}>()

const emit = defineEmits<{
  'mode-change': [mode: AutofillMode]
}>()

ensureSvgSprite()
onMounted(() => {
  ensureSvgSprite()
})

const viewportCtx = useSheetViewportOptional()

const menuOpen = ref(false)
const selectedMode = ref<AutofillMode>('sequence')

watch(
  () => props.lastAutofill,
  (val) => {
    if (val) {
      selectedMode.value = 'sequence'
    } else {
      menuOpen.value = false
    }
  },
)

const menuOptions: Array<{ key: AutofillMode; label: string }> = [
  { key: 'copy', label: '以相同内容填充' },
  { key: 'sequence', label: '以序列方式填充' },
  { key: 'formatOnly', label: '仅填充格式' },
  { key: 'noFormat', label: '不带格式填充' },
]

function getPopupContainer(triggerNode?: HTMLElement): HTMLElement {
  return triggerNode?.parentElement ?? document.body
}

const btnPos = computed(() => {
  if (!props.lastAutofill || !viewportCtx) return null
  const { sourceRange, targetRange } = props.lastAutofill
  const layout = viewportCtx.layout.value
  void viewportCtx.viewportTick.value

  const fullR0 = Math.min(sourceRange.r0, targetRange.r0)
  const fullR1 = Math.max(sourceRange.r1, targetRange.r1)
  const fullC0 = Math.min(sourceRange.c0, targetRange.c0)
  const fullC1 = Math.max(sourceRange.c1, targetRange.c1)

  const M = resolveMetrics(layout)
  const box = selectionBox(layout, M, fullR0, fullC0, fullR1, fullC1)

  const right = box.x + box.w
  const bottom = box.y + box.h

  // 视口边界检查：如果超出可视范围则隐藏
  if (
    right < layout.rowHeaderWidth ||
    bottom < layout.columnHeaderHeight ||
    box.x > layout.viewportW ||
    box.y > layout.viewportH
  ) {
    return null
  }

  return {
    x: right - 12,
    y: bottom + 2,
  }
})

const visible = computed(() => !!btnPos.value)

const buttonStyle = computed<CSSProperties>(() => {
  if (!btnPos.value) return { display: 'none' }
  return {
    left: `${btnPos.value.x + 15}px`,
    top: `${btnPos.value.y - 20}px`,
  }
})

function handleSelect(mode: AutofillMode) {
  selectedMode.value = mode
  // 点击内部选项不关闭下拉框，保持打开状态；点击外部才关闭
  if (!viewportCtx || !props.lastAutofill) return

  const s = viewportCtx.sheet.value
  if (!s) return

  const { sourceRange, targetRange, direction, originalTargetCells } = props.lastAutofill

  // 1. 还原目标区域初始内容（保证幂等切换模式无残余数据）
  if (originalTargetCells && originalTargetCells.length > 0) {
    for (const item of originalTargetCells) {
      if (item.cell) {
        s.state.setCell(item.r, item.c, { ...item.cell })
      } else {
        s.state.deleteCell(item.r, item.c)
      }
    }
  }

  // 2. 以新模式重新执行填充
  s.chain()
    .autofill({
      sourceRange,
      targetRange,
      direction,
      mode,
    })
    .run()

  emit('mode-change', mode)
}
</script>

<style scoped lang="less">
.sheet-autofill-options-btn-wrap {
  position: absolute;
  z-index: 25;
  pointer-events: auto;
}

.sheet-autofill-options-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #ffffff;
  border: 1px solid #595959;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.15s ease;
  padding: 0;
  color: #595959;
  &:hover {
    color: #1677ff;
    border-color: #1677ff;
  }
}

.sheet-autofill-options-btn:hover {
  background: #f0f7ff;
  border-color: #1677ff;
  color: #1677ff;
}

.sheet-autofill-options-btn :deep(svg),
.sheet-autofill-icon {
  width: 14px;
  height: 14px;
  display: block;
}

.sheet-autofill-menu-card {
  min-width: 140px;
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 0 1px rgba(0, 0, 0, 0.1);
  padding: 6px 0;
  border: 1px solid #f0f0f0;
}

.sheet-autofill-menu-item {
  display: flex;
  align-items: center;
  padding: 6px 12px 6px 8px;
  font-size: 13px;
  color: #262626;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.1s;
}

.sheet-autofill-menu-item:hover {
  background-color: #f5f5f5;
}

.sheet-autofill-menu-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  font-size: 12px;
}

.sheet-autofill-check-icon {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.85);
}

.sheet-autofill-menu-label {
  flex: 1;
}
</style>

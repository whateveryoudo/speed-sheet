<template>
  <a-dropdown
    v-model:open="dropdownOpen"
    trigger="click"
    placement="bottomLeft"
    :disabled="disableMenu"
    overlay-class-name="sheet-sort-dropdown"
  >
    <s-keymap-tip :title="disableMenu ? null : t('toolbar.sort')">
      <a-button
        type="text"
        class="shadow-btn-wrapper"
        :disabled="disableMenu"
      >
        <span class="inline-flex items-center justify-center">
          <sort-ascending-outlined style="font-size: 15px;" />
        </span>
        <caret-down-outlined class="dropdown-trigger" />
      </a-button>
    </s-keymap-tip>

    <template #overlay>
      <a-menu class="sheet-sort-menu-panel" @click="onMenuClick">
        <!-- 升序 (A -> Z) -->
        <a-menu-item key="asc">
          <div class="menu-item-inner">
            <span class="menu-icon">
              <sort-ascending-outlined />
            </span>
            <span class="menu-label">{{ t('toolbar.sortAsc') }}</span>
          </div>
        </a-menu-item>

        <!-- 降序 (Z -> A) -->
        <a-menu-item key="desc">
          <div class="menu-item-inner">
            <span class="menu-icon">
              <sort-descending-outlined />
            </span>
            <span class="menu-label">{{ t('toolbar.sortDesc') }}</span>
          </div>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>

  <!-- 排序区域确认弹窗 -->
  <a-modal
    v-model:open="modalOpen"
    :title="t('toolbar.sortExpandTitle')"
    :width="440"
    :ok-text="'确定'"
    :cancel-text="'取消'"
    centered
    @ok="onConfirmModal"
  >
    <div class="sort-modal-content">
      <p class="sort-modal-tip">{{ t('toolbar.sortExpandTip') }}</p>
      <a-radio-group v-model:value="chosenScopeType" class="sort-radio-group">
        <a-radio value="expand">
          {{ t('toolbar.sortExpandOption', { range: expandRangeLabel }) }}
        </a-radio>
        <a-radio value="keep">
          {{ t('toolbar.sortKeepOption', { range: currentRangeLabel }) }}
        </a-radio>
      </a-radio-group>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  SortAscendingOutlined,
  SortDescendingOutlined,
  CaretDownOutlined,
} from '@ant-design/icons-vue'
import {
  detectExpandedRange,
  normalizeSelectionBox,
  isSameRange,
  formatRangeLabel,
  type CellRangeBox,
} from '@speed-sheet/core'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const { t } = useI18n()
const { sheet, editableCpt, anchorRc } = useSheetToolbar()

const dropdownOpen = ref(false)
const modalOpen = ref(false)
const chosenScopeType = ref<'expand' | 'keep'>('expand')

const pendingAscending = ref(true)
const pendingCurrentBox = ref<CellRangeBox>({ r0: 0, r1: 0, c0: 0, c1: 0 })
const pendingExpandBox = ref<CellRangeBox>({ r0: 0, r1: 0, c0: 0, c1: 0 })

const currentRangeLabel = computed(() => formatRangeLabel(pendingCurrentBox.value))
const expandRangeLabel = computed(() => formatRangeLabel(pendingExpandBox.value))

const disableMenu = computed(() => !editableCpt.value || !sheet.value)

function executeSort(box: CellRangeBox, ascending: boolean) {
  if (!sheet.value) return
  const sortCol = anchorRc.value?.c ?? box.c0
  ;(sheet.value as any).chain().sortRange({
    range: box,
    sortCol,
    ascending,
  }).run()
}

function onMenuClick(info: any) {
  dropdownOpen.value = false
  if (!sheet.value) return

  const ascending = info.key === 'asc'
  pendingAscending.value = ascending

  const sel = sheet.value.state.getSelection()
  const currentBox = normalizeSelectionBox(sel)
  const expandedBox = detectExpandedRange(sheet.value.state, sel)

  // 如果扩展后的区域大于当前选区（说明四周紧挨着其他数据）
  if (!isSameRange(currentBox, expandedBox)) {
    pendingCurrentBox.value = currentBox
    pendingExpandBox.value = expandedBox
    chosenScopeType.value = 'expand'
    modalOpen.value = true
  } else {
    // 四周无相连数据或已经是整块数据，直接排
    executeSort(currentBox, ascending)
  }
}

function onConfirmModal() {
  modalOpen.value = false
  const targetBox =
    chosenScopeType.value === 'expand'
      ? pendingExpandBox.value
      : pendingCurrentBox.value
  executeSort(targetBox, pendingAscending.value)
}
</script>

<style lang="less">
.sheet-sort-dropdown {
  .sheet-sort-menu-panel {
    min-width: 120px;
    padding: 4px 0;

    .ant-dropdown-menu-item {
      padding: 6px 12px;
      line-height: 22px;
    }

    .menu-item-inner {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;

      .menu-icon {
        font-size: 14px;
        display: inline-flex;
        align-items: center;
      }
    }
  }
}

.sort-modal-content {
  padding: 8px 0 16px;

  .sort-modal-tip {
    font-size: 14px;
    color: #333;
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .sort-radio-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}
</style>

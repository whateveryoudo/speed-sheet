<template>
  <a-dropdown v-model:open="open" :trigger="['click']" :disabled="!editableCpt">
    <a-tooltip title="插入">
      <a-button type="text" class="shadow-btn-wrapper" :disabled="!editableCpt">
        <plus-circle-filled class="text-[16px] text-[var(--speed-toolbar-icon-color)]" />
      </a-button>
    </a-tooltip>
    <template #overlay>
      <a-menu class="sheet-insert-menu min-w-[200px]" @click="onMenuClick">
        <template v-for="(group, gi) in menuGroups" :key="group.key">
          <template v-for="item in group.children" :key="item.key">
            <a-sub-menu v-if="item.key === 'formula'" key="formula" popup-class-name="sheet-insert-formula-sub">
              <template #title>
                <span class="sheet-insert-menu-item__inner">
                  <component :is="item.icon" v-if="item.icon" class="sheet-insert-menu-item__icon" />
                  <span>公式</span>
                  <right-outlined class="sheet-insert-menu-item__more" />
                </span>
              </template>
              <a-menu-item-group title="常用">
                <a-menu-item
                  v-for="fn in formulaFeatured()"
                  :key="`fn:${fn.name}`"
                  @click="onFormulaPick(fn.name)"
                >
                  {{ fn.name }}({{ fn.label }})
                </a-menu-item>
              </a-menu-item-group>
              <a-menu-divider />
              <a-sub-menu
                v-for="cat in formulaCategories()"
                :key="`cat-${cat}`"
                :title="categoryLabel(cat, sheetLocale())"
              >
                <a-menu-item
                  v-for="fn in formulaByCategory(cat)"
                  :key="`fn:${fn.name}`"
                  @click="onFormulaPick(fn.name)"
                >
                  {{ fn.name }}
                </a-menu-item>
              </a-sub-menu>
            </a-sub-menu>
            <a-menu-item v-else :key="item.key" :disabled="item.disabled">
              <span class="sheet-insert-menu-item__inner">
                <component :is="item.icon" v-if="item.icon" class="sheet-insert-menu-item__icon" />
                <span class="flex-1">{{ item.label }}</span>
                <span v-if="item.shortcut" class="sheet-insert-menu-item__shortcut">{{ item.shortcut }}</span>
              </span>
            </a-menu-item>
          </template>
          <a-menu-divider v-if="gi < menuGroups.length - 1" />
        </template>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FunctionOutlined, PlusCircleFilled, RightOutlined } from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'
import { useInsertMenuContext } from '../../composables/useInsertMenuContext'
import { useDropdownConfigPanel } from '../../composables/useDropdownConfigPanel'
import { useLinkConfigPanel } from '../../composables/useLinkConfigPanel'
import { useNoteConfigPanel } from '../../composables/useNoteConfigPanel'
import { useInsertMenu } from './useInsertMenu'
import { useInsertActions } from './useInsertActions'

const open = ref(false)

const { sheet, editableCpt, revision, anchorRc, selection } = useSheetToolbar()
const { insertMenuKeys, insertMenuConfig } = useInsertMenuContext()
const { openPanel: openDropdownPanel } = useDropdownConfigPanel()
const { openPanel: openLinkPanel } = useLinkConfigPanel()
const { openPanel: openNotePanel } = useNoteConfigPanel()

const {
  registerAction,
  runAction,
  runFormulaPick,
  formulaFeatured,
  formulaCategories,
  formulaByCategory,
  categoryLabel,
  sheetLocale,
} = useInsertActions({
  sheet,
  revision,
  getAnchor: () => anchorRc.value,
  getSelection: () => selection.value ?? null,
  onOpenDropdownPanel: ({ r, c }) => {
    openDropdownPanel({ r, c })
    open.value = false
  },
  onOpenLinkPanel: ({ r, c }) => {
    openLinkPanel({ r, c })
    open.value = false
  },
  onOpenNotePanel: ({ r, c }) => {
    openNotePanel({ r, c, applySelection: true, autoFocus: true })
    open.value = false
  },
})

const { menuGroups } = useInsertMenu({
  insertMenuKeys,
  insertMenuConfig,
  registerAction,
})

function actionCtx() {
  return {
    sheet: sheet.value ?? null,
    anchor: anchorRc.value,
    selection: selection.value ?? null,
  }
}

async function onMenuClick(info: { key: string | number }): Promise<void> {
  const key = String(info.key)
  if (key === 'formula' || key.startsWith('fn:') || key.startsWith('cat-')) return
  open.value = false
  try {
    await runAction(key, actionCtx())
  } catch (e) {
    console.error(e)
  }
}

function onFormulaPick(name: string): void {
  open.value = false
  runFormulaPick(name, actionCtx())
}
</script>

<style scoped lang="less">
.sheet-insert-menu-item__inner {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.sheet-insert-menu-item__icon {
  font-size: 16px;
  color: var(--ant-color-text-secondary);
}

.sheet-insert-menu-item__shortcut {
  margin-left: auto;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.sheet-insert-menu-item__more {
  margin-left: auto;
  font-size: 10px;
  color: var(--ant-color-text-tertiary);
}
</style>

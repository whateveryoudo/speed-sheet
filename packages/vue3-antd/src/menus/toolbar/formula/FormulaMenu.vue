<template>
  <a-dropdown v-model:open="menuOpen" :trigger="['click']" :disabled="!editableCpt"
    overlay-class-name="formula-menu-dropdown">
    <s-keymap-tip :title="editableCpt ? t('toolbar.formula') : null">
      <a-button type="text" class="shadow-btn-wrapper" :disabled="!editableCpt">
        <s-icon-font type="icon-kl-formula" />
        <CaretDownOutlined class="dropdown-trigger" style="font-size: 12px;" />
      </a-button>
    </s-keymap-tip>
    <template #overlay>
      <a-menu :selectable="false" class="formula-menu-list min-w-160px" @click="onPick">
        <a-menu-item-group :title="t('formula.common')">
          <FormulaMenuHintPopover v-for="fn in featured" :key="fn.name" :fn="fn">
            <a-menu-item :key="fn.name">
              {{ fn.name }}({{ fn.label }})
            </a-menu-item>
          </FormulaMenuHintPopover>

        </a-menu-item-group>
        <a-menu-divider />
        <a-sub-menu v-for="cat in categories" :key="cat" :title="categoryLabel(cat, sheetLocale)">
          <div class="max-h-[600px] overflow-y-auto">
            <FormulaMenuHintPopover v-for="fn in byCategory(cat)" :key="fn.name" :fn="fn">
              <a-menu-item :key="fn.name">
                {{ fn.name }}
              </a-menu-item>
            </FormulaMenuHintPopover>
          </div>
        </a-sub-menu>
        <a-menu-divider />
        <a-menu-item key="__browser__">
          {{ t('formula.allFunctions') }}
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
  <FormulaFunctionBrowser v-model:open="browserOpen" />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CaretDownOutlined } from '@ant-design/icons-vue'
import {
  getFeaturedBuiltins,
  getCategoriesWithBuiltins,
  getBuiltinsByCategory,
  categoryLabel,
  type FormulaCategoryId,
} from '@speed-sheet/extension-formula'
import { useSheetToolbar } from '../../../composables/useSheetToolbar'
import { useFormulaEdit } from '@speed-sheet/vue3'
import { useSheetLocale } from '../../../composables/useSheetLocale'
import FormulaFunctionBrowser from './FormulaFunctionBrowser.vue'
import FormulaMenuHintPopover from './FormulaMenuHintPopover.vue'

const { t } = useI18n()
const { locale } = useSheetLocale()
const sheetLocale = computed(() => (locale.value.startsWith('en') ? 'en' : 'zh'))
const { editableCpt, anchorRc, sheet } = useSheetToolbar()
const formulaEdit = useFormulaEdit()

const menuOpen = ref(false)
const browserOpen = ref(false)

const featured = computed(() => getFeaturedBuiltins())
const categories = computed(() => getCategoriesWithBuiltins())

function byCategory(cat: FormulaCategoryId) {
  return getBuiltinsByCategory(cat)
}

function onPick({ key }: { key: string | number }) {
  menuOpen.value = false
  if (key === '__browser__') {
    browserOpen.value = true
    return
  }
  const s = sheet.value
  if (!s) return
  const { r, c } = anchorRc.value
  formulaEdit.pickFunction(s, r, c, String(key))
}
</script>

<style lang="less">
.formula-menu-list {
  max-height: 360px;
  overflow-y: auto;
  /* 增加一个圆角（antd官网好像没有圆角，submenu） */
  .ant-dropdown-menu-submenu-title {
    border-radius: 4px;
  }
}

</style>

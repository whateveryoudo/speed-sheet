import { defineComponent, computed, type PropType } from 'vue'
import { Space, Divider } from 'ant-design-vue'
import InsertMenu from '../insert/InsertMenu.vue'
import Undo from './undo.vue'
import Redo from './redo.vue'
import FormatPainter from './formatPainter.vue'
import ClearFormat from './clearFormat.vue'
import Bold from './bold.vue'
import Italic from './italic.vue'
import Underline from './underline.vue'
import FontSize from './fontSize.vue'
import FormulaMenu from './formula/FormulaMenu.vue'
import TextColor from './textColor.vue'
import BackgroundColor from './backgroundColor.vue'
import Align from './align'
import Link from './link/index.vue'
import Filter from './filter.vue'
import Protect from './protect.vue'
import ConditionalFormat from './conditionalFormat.vue'
import Freeze from './freeze.vue'
import FindAndReplace from './findAndReplace.vue'
import { defaultSheetToolbarKeys } from './keys'
import type { ToolbarItemConfig } from './types'

const componentMap = {
  insert: InsertMenu,
  undo: Undo,
  redo: Redo,
  'format-painter': FormatPainter,
  clearFormat: ClearFormat,
  fontSize: FontSize,
  formula: FormulaMenu,
  bold: Bold,
  italic: Italic,
  underline: Underline,
  textColor: TextColor,
  backgroundColor: BackgroundColor,
  align: Align,
  filter: Filter,
  conditionalFormat: ConditionalFormat,
  protect: Protect,
  freeze: Freeze,
  link: Link,
  findAndReplace: FindAndReplace,
}

export default defineComponent({
  name: 'SheetToolbarMenuBar',
  props: {
    toolbarKeys: {
      type: Array as PropType<ToolbarItemConfig[]>,
      default: undefined,
    },
    excludeKeys: {
      type: Array as PropType<string[]>,
      default: undefined,
    },
  },
  setup(props) {
    const realToolbarKeys = computed(() => {
      if (props.toolbarKeys && props.excludeKeys) {
        console.warn('同时传入了 toolbarKeys 和 excludeKeys，将只生效 toolbarKeys')
      }
      if (props.toolbarKeys) return props.toolbarKeys
      const base = defaultSheetToolbarKeys
      if (!props.excludeKeys?.length) return base
      return base.filter((key) => {
        const k = typeof key === 'string' ? key : key.key
        return k === '|' || !props.excludeKeys!.includes(k)
      })
    })

    const processedToolbarKeys = computed(() => {
      const keys = realToolbarKeys.value
      const result: Array<{ key: string; showDivider: boolean }> = []

      for (let i = 0; i < keys.length; i++) {
        const currentKey = keys[i]
        const nextKey = keys[i + 1]
        const currentKeyValue =
          typeof currentKey === 'string' ? currentKey : currentKey.key

        if (currentKeyValue === '|') continue

        const nextKeyValue =
          nextKey === undefined
            ? undefined
            : typeof nextKey === 'string'
              ? nextKey
              : nextKey.key

        const showDivider = nextKeyValue === '|' && i + 1 < keys.length
        result.push({ key: currentKeyValue, showDivider })
      }

      return result
    })

    return () => (
      <header class="flex items-center w-full px-0.5">
        <Space size={8}>
          {processedToolbarKeys.value.map(({ key, showDivider }) => {
            const Component = componentMap[key as keyof typeof componentMap]
            return (
              <>
                {Component ? <Component /> : null}
                {showDivider ? <Divider type="vertical" class="menu-divider" /> : null}
              </>
            )
          })}
        </Space>
      </header>
    )
  },
})

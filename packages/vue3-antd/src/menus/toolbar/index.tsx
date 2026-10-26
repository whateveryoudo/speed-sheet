import { defineComponent, computed, type PropType } from 'vue'
import { Space, Divider } from 'ant-design-vue'
import InsertMenu from '../insert/InsertMenu.vue'
import Undo from './undo.vue'
import Redo from './redo.vue'
import FormatPainter from './formatPainter.vue'
import ClearFormat from './clearFormat.vue'
import Bold from './bold.vue'
import Italic from './italic.vue'
import Strikethrough from './strikethrough.vue'
import Underline from './underline.vue'
import FontSize from './fontSize.vue'
import NumberFormat from './numberFormat.vue'
import DecimalPlaces from './decimalPlaces.vue'
import FormulaMenu from './formula/FormulaMenu.vue'
import TextColor from './textColor.vue'
import BackgroundColor from './backgroundColor.vue'
import Border from './border.vue'
import Merge from './merge.vue'
import Align from './align'
import VerticalAlign from './verticalAlign.vue'
import TextWrap from './textWrap.vue'
import Link from './link/index.vue'
import Dropdown from './dropdown.vue'
import Chart from './chart.vue'
import Filter from './filter.vue'
import Sort from './sort.vue'
import Protect from './protect.vue'
import ConditionalFormat from './conditionalFormat.vue'
import Freeze from './freeze.vue'
import FindAndReplace from './findAndReplace.vue'
import Import from './import.vue'
import Export from './export.vue'
import { defaultSheetToolbarKeys } from './keys'
import type { ToolbarItemConfig } from './types'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

const componentMap = {
  insert: InsertMenu,
  undo: Undo,
  redo: Redo,
  'format-painter': FormatPainter,
  clearFormat: ClearFormat,
  numberFormat: NumberFormat,
  decimalPlaces: DecimalPlaces,
  fontSize: FontSize,
  formula: FormulaMenu,
  bold: Bold,
  italic: Italic,
  strikethrough: Strikethrough,
  underline: Underline,
  textColor: TextColor,
  backgroundColor: BackgroundColor,
  border: Border,
  merge: Merge,
  align: Align,
  verticalAlign: VerticalAlign,
  textWrap: TextWrap,
  filter: Filter,
  sort: Sort,
  conditionalFormat: ConditionalFormat,
  protect: Protect,
  freeze: Freeze,
  link: Link,
  dropdown: Dropdown,
  chart: Chart,
  findAndReplace: FindAndReplace,
  import: Import,
  export: Export,
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
    const { sheet } = useSheetToolbar()

    // 1. 动态收集扩展通过 addToolbarItem 注册的工具栏组件
    const extensionToolbarMap = computed(() => {
      const map: Record<string, any> = {}
      const exts = sheet.value?.extensions || []
      for (const ext of exts) {
        const item = (ext as any).getToolbarItem?.()
        if (!item) continue
        if (Array.isArray(item)) {
          for (const subItem of item) {
            if (typeof subItem === 'object' && subItem !== null && 'component' in subItem) {
              const key = subItem.key || ext.name
              map[key] = subItem.component
            }
          }
        } else if (typeof item === 'object' && item !== null && 'component' in item) {
          const key = item.key || ext.name
          map[key] = item.component
        } else {
          map[ext.name] = item
        }
      }
      return map
    })

    const realToolbarKeys = computed(() => {
      if (props.toolbarKeys && props.excludeKeys) {
        console.warn('同时传入了 toolbarKeys 和 excludeKeys，将只生效 toolbarKeys')
      }
      if (props.toolbarKeys) return props.toolbarKeys
      const base = [...defaultSheetToolbarKeys]
      const extKeys = Object.keys(extensionToolbarMap.value)
      if (extKeys.length > 0) {
        base.push('|', ...extKeys)
      }
      if (!props.excludeKeys?.length) return base
      return base.filter((key) => {
        const k = typeof key === 'string' ? key : key.key
        return k === '|' || !props.excludeKeys!.includes(k)
      })
    })

    // 2. 收集内联在 toolbarKeys 传入的自定义组件映射 { key: 'xxx', component: MyComp }
    const inlineCustomMap = computed(() => {
      const map: Record<string, any> = {}
      const keys = realToolbarKeys.value
      for (const item of keys) {
        if (typeof item === 'object' && item !== null && 'component' in item && item.component) {
          map[item.key] = item.component
        }
      }
      return map
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
            const Component =
              inlineCustomMap.value[key] ||
              extensionToolbarMap.value[key] ||
              componentMap[key as keyof typeof componentMap]
            if (!Component) return null
            return (
              <>
                <Component />
                {showDivider ? <Divider type="vertical" class="menu-divider" /> : null}
              </>
            )
          })}
        </Space>
      </header>
    )
  },
})

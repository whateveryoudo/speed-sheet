import {
  CaretDownOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  AlignCenterOutlined,
} from '@ant-design/icons-vue'
import { type VNode, computed, ref, defineComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import { Space, Popover, Button } from 'ant-design-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

type AlignType = 'left' | 'center' | 'right'

interface AlignButton {
  key: AlignType
  titleKey: string
  shortcutKey: 'alignLeft' | 'alignCenter' | 'alignRight'
  ht: 0 | 1 | 2
  iconRender?: () => VNode
}

export default defineComponent({
  name: 'SheetAlignMenu',
  props: {
    placement: {
      type: String as () => 'top' | 'bottom' | 'left' | 'right',
      default: 'bottom',
    },
  },
  setup(props) {
    const open = ref(false)
    const { t } = useI18n()
    const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

    const disableMenu = computed(() => !editableCpt.value)

    const current = computed<AlignType>(() => {
      const ht = activeCell.value?.ht
      if (ht === 2) return 'right'
      if (ht === 0) return 'center'
      return 'left'
    })

    const alignButtons = computed<AlignButton[]>(() => [
      {
        key: 'left',
        titleKey: 'toolbar.alignLeft',
        shortcutKey: 'alignLeft',
        ht: 1,
        iconRender: () => <AlignLeftOutlined />,
      },
      {
        key: 'center',
        titleKey: 'toolbar.alignCenter',
        shortcutKey: 'alignCenter',
        ht: 0,
        iconRender: () => <AlignCenterOutlined />,
      },
      {
        key: 'right',
        titleKey: 'toolbar.alignRight',
        shortcutKey: 'alignRight',
        ht: 2,
        iconRender: () => <AlignRightOutlined />,
      },
    ])

    const selectButton = computed(
      () =>
        alignButtons.value.find((item) => item.key === current.value) ??
        alignButtons.value[0]!,
    )

    function applyAlign(ht: 0 | 1 | 2) {
      if (!sheet.value) return
      forEachSelectedCell((r, c) => {
        sheet.value!.chain().setTextAlign({ r, c, align: ht }).run()
      })
      open.value = false
    }

    return () => (
      <Popover
        v-model:open={open.value}
        overlayClassName="align-popover-wrapper"
        trigger="click"
        placement={props.placement}
        content={
          !disableMenu.value ? (
            <Space class="align-list-wrapper">
              {alignButtons.value.map((item) => (
                <s-keymap-tip
                  key={item.key}
                  title={t(item.titleKey)}
                  keyMap={getShortcutTipByKey(item.shortcutKey)}
                >
                  <Button
                    type="text"
                    class={[
                      'shadow-btn-wrapper',
                      selectButton.value.key === item.key ? 'is-active' : '',
                    ]}
                    onClick={() => applyAlign(item.ht)}
                  >
                    {item.iconRender && <s-icon-font iconRender={item.iconRender} />}
                  </Button>
                </s-keymap-tip>
              ))}
            </Space>
          ) : null
        }
      >
        <s-keymap-tip keyMap={getShortcutTipByKey(selectButton.value.shortcutKey)} title={disableMenu.value ? null : t('toolbar.align')}>
          <Button disabled={disableMenu.value} type="text" class="shadow-btn-wrapper">
            {selectButton.value.iconRender && (
              <s-icon-font iconRender={selectButton.value.iconRender} />
            )}
            <CaretDownOutlined class="dropdown-trigger" />
          </Button>
        </s-keymap-tip>
      </Popover>
    )
  },
})

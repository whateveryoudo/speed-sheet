import {
  CaretDownOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  AlignCenterOutlined,
} from '@ant-design/icons-vue'
import { type VNode, computed, ref, defineComponent } from 'vue'
import { Popover, Tooltip, Button, Space } from 'ant-design-vue'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

type AlignType = 'left' | 'center' | 'right'

interface AlignButton {
  key: AlignType
  tip: string
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
    const { sheet, editableCpt, activeCell, forEachSelectedCell } = useSheetToolbar()

    const disableMenu = computed(() => !editableCpt.value)

    const current = computed<AlignType>(() => {
      const ht = activeCell.value?.ht
      if (ht === 2) return 'right'
      if (ht === 0) return 'center'
      return 'left'
    })

    const alignButtons = ref<AlignButton[]>([
      {
        key: 'left',
        tip: '左对齐',
        ht: 1,
        iconRender: () => <AlignLeftOutlined />,
      },
      {
        key: 'center',
        tip: '居中',
        ht: 0,
        iconRender: () => <AlignCenterOutlined />,
      },
      {
        key: 'right',
        tip: '右对齐',
        ht: 2,
        iconRender: () => <AlignRightOutlined />,
      },
    ])

    const selectButton = computed(
      () =>
        alignButtons.value.find((item) => item.key === current.value) ??
        alignButtons.value[0],
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
                <Tooltip key={item.key} title={item.tip}>
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
                </Tooltip>
              ))}
            </Space>
          ) : null
        }
      >
        <Tooltip
          title={disableMenu.value ? null : '对齐方式'}
          placement={props.placement}
        >
          <Button disabled={disableMenu.value} type="text" class="shadow-btn-wrapper">
            {selectButton.value.iconRender && (
              <s-icon-font iconRender={selectButton.value.iconRender} />
            )}
            <CaretDownOutlined class="dropdown-trigger" />
          </Button>
        </Tooltip>
      </Popover>
    )
  },
})

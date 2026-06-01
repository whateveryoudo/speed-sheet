import type { InsertMenuItemDef } from './types'
import {
  CheckSquareOutlined,
  UnorderedListOutlined,
  PictureOutlined,
  LinkOutlined,
  PaperClipOutlined,
  FormOutlined,
  DownCircleOutlined
} from '@ant-design/icons-vue'
import { IconFont } from 'speed-components-ui/components'

/** 内置叶子项定义（图标用 ant-design-vue） */
export const builtinInsertMenuItems: Record<string, Omit<InsertMenuItemDef, 'action'>> = {
  checkbox: { key: 'checkbox', label: '复选框', icon: CheckSquareOutlined },
  dropdown: { key: 'dropdown', label: '下拉列表', icon: DownCircleOutlined   },
  image: { key: 'image', label: '图片', icon: PictureOutlined },
  link: { key: 'link', label: '链接', icon: LinkOutlined, shortcut: '⌘K', disabled: true },
  attachment: { key: 'attachment', label: '附件', icon: PaperClipOutlined },
  note: { key: 'note', label: '备注', icon: FormOutlined, disabled: true },
  formula: { key: 'formula', label: '公式', icon: <IconFont type="icon-kl-formula" /> },
  // insertRowAbove: { key: 'insertRowAbove', label: '在上方插入行' },
  // insertRowBelow: { key: 'insertRowBelow', label: '在下方插入行' },
  // insertColLeft: { key: 'insertColLeft', label: '在左侧插入列' },
  // insertColRight: { key: 'insertColRight', label: '在右侧插入列' },
}

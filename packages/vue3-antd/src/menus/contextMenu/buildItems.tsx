import type { VNode } from 'vue'
import type { SheetT } from '../../i18n'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import type { ContextMenuActionContext } from '../../types'
import type { ContextMenuTarget } from '../../types'
import { ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons-vue'
import {
  formatColLabel,
  formatRowLabel,
  isMultiCellSelection,
  selectionColCount,
  selectionRowCount,
} from './format'

export type ProcessedContextMenuItem =
  | { type: 'divider' }
  | { type: 'item'; key: string; title: string; disabled?: boolean; shortcut?: string }
  | {
      type: 'insert'
      key: string
      direction: 'row-above' | 'row-below' | 'col-left' | 'col-right'
      prefixIcon: VNode
      label: string
      unit: string
      defaultCount: number
    }
  | { type: 'merge'; key: string; title: string; disabled?: boolean }

function clipboardItems(t: SheetT): ProcessedContextMenuItem[] {
  return [
    { type: 'item', key: 'cut', title: t('contextMenu.cut'), shortcut: getShortcutTipByKey('cut') },
    { type: 'item', key: 'copy', title: t('contextMenu.copy'), shortcut: getShortcutTipByKey('copy') },
    { type: 'item', key: 'paste', title: t('contextMenu.paste'), shortcut: getShortcutTipByKey('paste') },
  ]
}

function insertItems(
  t: SheetT,
  target: ContextMenuTarget,
  rowCount: number,
  colCount: number,
): ProcessedContextMenuItem[] {
  const items: ProcessedContextMenuItem[] = []
  const showRows = target === 'cell' || target === 'range' || target === 'row'
  const showCols = target === 'cell' || target === 'range' || target === 'column'

  if (showRows) {
    items.push(
      {
        type: 'insert',
        key: 'insertRowAbove',
        direction: 'row-above',
        prefixIcon: <ArrowUpOutlined />,
        label: t('contextMenu.insertRowAbove'),
        unit: t('contextMenu.rowUnit'),
        defaultCount: rowCount,
      },
      {
        type: 'insert',
        key: 'insertRowBelow',
        direction: 'row-below',
        prefixIcon: <ArrowDownOutlined />,
        label: t('contextMenu.insertRowBelow'),
        unit: t('contextMenu.rowUnit'),
        defaultCount: rowCount,
      },
    )
  }
  if (showCols) {
    items.push(
      {
        type: 'insert',
        key: 'insertColLeft',
        direction: 'col-left',
        prefixIcon: <ArrowLeftOutlined />,
        label: t('contextMenu.insertColLeft'),
        unit: t('contextMenu.colUnit'),
        defaultCount: colCount,
      },
      {
        type: 'insert',
        key: 'insertColRight',
        direction: 'col-right',
        prefixIcon: <ArrowRightOutlined />,
        label: t('contextMenu.insertColRight'),
        unit: t('contextMenu.colUnit'),
        defaultCount: colCount,
      },
    )
  }
  return items
}

/** 按语雀场景生成菜单项 */
export function buildContextMenuItems(
  ctx: ContextMenuActionContext,
  t: SheetT,
): ProcessedContextMenuItem[] {
  const selection = ctx.selection
  if (!selection) return []

  const target = ctx.target ?? 'cell'
  const rowCount = selectionRowCount(selection)
  const colCount = selectionColCount(selection)
  const rowLabel = formatRowLabel(selection.row)
  const colLabel = formatColLabel(selection.column)

  const items: ProcessedContextMenuItem[] = [...clipboardItems(t)]
  items.push({ type: 'divider' })
  items.push(...insertItems(t, target, rowCount, colCount))
  items.push({ type: 'divider' })

  const showDeleteRow = target === 'cell' || target === 'range' || target === 'row'
  const showDeleteCol = target === 'cell' || target === 'range' || target === 'column'

  if (showDeleteRow) {
    items.push({
      type: 'item',
      key: 'deleteRows',
      title: t('contextMenu.deleteRow', { rows: rowLabel }),
    })
  }
  if (showDeleteCol) {
    items.push({
      type: 'item',
      key: 'deleteCols',
      title: t('contextMenu.deleteCol', { cols: colLabel }),
    })
  }

  if ((target === 'range' || target === 'cell') && isMultiCellSelection(selection)) {
    items.push({ type: 'divider' })
    items.push({
      type: 'merge',
      key: 'mergeCells',
      title: t('contextMenu.mergeCells'),
      disabled: rowCount === 1 && colCount === 1,
    })
  }

  items.push({ type: 'divider' })
  items.push({ type: 'item', key: 'clear', title: t('contextMenu.clear') })

  return items
}

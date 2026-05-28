import type { VNode } from 'vue'
import type { SheetT } from '../../i18n'
import { getShortcutTipByKey } from '../../helpers/registKeyMap'
import type { ContextMenuActionContext } from '../../types'
import type { ContextMenuTarget } from '../../types'
import { ArrowUpOutlined, DeleteOutlined, ArrowDownOutlined, ArrowRightOutlined, ArrowLeftOutlined, MergeCellsOutlined } from '@ant-design/icons-vue'
import { MergeContext } from '@speed-sheet/core'
import {
  formatColLabel,
  formatRowLabel,
  isMultiCellSelection,
  selectionColCount,
  selectionRowCount,
} from './format'

export type ProcessedContextMenuItem =
  | { type: 'divider' }
  | { type: 'item'; key: string; prefixIcon?: () => VNode; title: string; disabled?: boolean; shortcut?: string }
  | {
      type: 'insert'
      key: string
      direction: 'row-above' | 'row-below' | 'col-left' | 'col-right'
      prefixIcon: () => VNode
      label: string
      unit: string
      defaultCount: number
    }
  | { type: 'merge'; key: string; prefixIcon: () => VNode; title: string; disabled?: boolean }

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
        prefixIcon: () => <ArrowUpOutlined />,
        label: t('contextMenu.insertRowAbove'),
        unit: t('contextMenu.rowUnit'),
        defaultCount: rowCount,
      },
      {
        type: 'insert',
        key: 'insertRowBelow',
        direction: 'row-below',
        prefixIcon: () => <ArrowDownOutlined />,
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
        prefixIcon: () => <ArrowLeftOutlined />,
        label: t('contextMenu.insertColLeft'),
        unit: t('contextMenu.colUnit'),
        defaultCount: colCount,
      },
      {
        type: 'insert',
        key: 'insertColRight',
        direction: 'col-right',
        prefixIcon: () => <ArrowRightOutlined />,
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
  const mc = ctx.sheet
    ? ctx.sheet.createMergeContext()
    : MergeContext.empty()
  const display = mc.displayBounds(selection)
  const displaySel = {
    ...selection,
    row: [display.r0, display.r1] as [number, number],
    column: [display.c0, display.c1] as [number, number],
  }
  const rowCount = mc.rowCountForSelection(selection)
  const colCount = mc.colCountForSelection(selection)
  const rowLabel = formatRowLabel(displaySel.row)
  const colLabel = formatColLabel(displaySel.column)

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
      prefixIcon: () => <DeleteOutlined />,
      title: t('contextMenu.deleteRow', { rows: rowLabel }),
    })
  }
  if (showDeleteCol) {
    items.push({
      type: 'item',
      key: 'deleteCols',
      prefixIcon: () => <DeleteOutlined />,
      title: t('contextMenu.deleteCol', { cols: colLabel }),
    })
  }

  const activeMerge = mc.mergeAtFocus(selection)
  if ((target === 'range' || target === 'cell') && activeMerge) {
    items.push({ type: 'divider' })
    items.push({
      type: 'merge',
      key: 'unmergeCells',
      prefixIcon: () => <MergeCellsOutlined />,
      title: t('contextMenu.unmergeCells'),
    })
  } else if ((target === 'range' || target === 'cell') && isMultiCellSelection(displaySel)) {
    items.push({ type: 'divider' })
    items.push({
      type: 'merge',
      key: 'mergeCells',
      prefixIcon: () => <MergeCellsOutlined />,
      title: t('contextMenu.mergeCells'),
      disabled: rowCount === 1 && colCount === 1,
    })
  }

  items.push({ type: 'divider' })
  items.push({ type: 'item', key: 'clear', title: t('contextMenu.clear') })

  return items
}

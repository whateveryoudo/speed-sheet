import type { Ref } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { cellHasRichContent, type Sheet } from '@speed-sheet/core'
import type { Selection } from '@speed-sheet/shared'
import { useSheetFileInsert, useSheetUploadConfig } from '@speed-sheet/vue3'
import { useSheetImageInsert } from '../../extensions/image'
import { useFormulaEdit } from '@speed-sheet/vue3'
import {
  getFeaturedBuiltins,
  getCategoriesWithBuiltins,
  getBuiltinsByCategory,
  categoryLabel,
} from '@speed-sheet/extension-formula'
import type { FormulaCategoryId } from '@speed-sheet/extension-formula'
import { useDropdownPickPanelOptional } from '../../composables/useDropdownPickPanel'
import { useSheetLocale } from '../../composables/useSheetLocale'
import type { InsertMenuAction, InsertMenuActionContext } from './types'

function eachCellInSelection(
  sheet: Sheet,
  sel: Selection,
  fn: (r: number, c: number) => void,
): void {
  const r0 = Math.min(sel.row[0], sel.row[1])
  const r1 = Math.max(sel.row[0], sel.row[1])
  const c0 = Math.min(sel.column[0], sel.column[1])
  const c1 = Math.max(sel.column[0], sel.column[1])
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      fn(r, c)
    }
  }
}

function selectionHasRichContent(sheet: Sheet, sel: Selection): boolean {
  let found = false
  eachCellInSelection(sheet, sel, (r, c) => {
    if (cellHasRichContent(sheet.state, r, c)) found = true
  })
  return found
}

export function useInsertActions(options: {
  sheet: Ref<Sheet | null | undefined>
  revision: Ref<number>
  getAnchor: () => { r: number; c: number }
  getSelection: () => Selection | null
  onOpenDropdownPanel: (payload: { r: number; c: number }) => void
}) {
  const uploadCfg = useSheetUploadConfig()
  const formulaEdit = useFormulaEdit()
  const { locale } = useSheetLocale()
  const sheetLocale = () => (locale.value.startsWith('en') ? 'en' : 'zh')

  function getCellSize(r: number, c: number): { w: number; h: number } {
    const s = options.sheet.value
    if (!s) return { w: 120, h: 25 }
    void options.revision.value
    return { w: s.state.getColWidth(c), h: s.state.getRowHeight(r) }
  }

  const fileInsert = useSheetFileInsert({
    sheet: options.sheet,
    getAnchor: options.getAnchor,
  })

  const imageInsert = useSheetImageInsert({
    sheet: options.sheet,
    getAnchor: options.getAnchor,
    getCellSize,
  })

  const pickPanel = useDropdownPickPanelOptional()

  const actions: Record<string, InsertMenuAction> = {
    checkbox: ({ sheet, anchor }) => {
      sheet?.chain().insertCheckbox({ r: anchor.r, c: anchor.c, checked: false }).run()
    },
    dropdown: ({ sheet, anchor, selection }) => {
      if (!sheet) return
      const sel = selection ?? sheet.state.getSelection()
      const open = () => {
        pickPanel?.closePick()
        options.onOpenDropdownPanel({ r: anchor.r, c: anchor.c })
      }
      if (selectionHasRichContent(sheet, sel)) {
        Modal.confirm({
          title: '设置下拉列表',
          content: '设置下拉列表会导致选区中的图片和附件丢失，确定要添加吗？',
          okText: '确定',
          cancelText: '取消',
          onOk: open,
        })
        return
      }
      open()
    },
    image: async () => {
      const accept =
        uploadCfg.value.imageAccept ?? '.png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.heic'
      const files = await fileInsert.pickFiles(accept, true)
      if (!files.length) return
      const n = await imageInsert.insertImagesFromFiles(files)
      if (n < files.length) message.error('部分图片插入失败')
    },
    link: () => {
      message.info('单元格链接待实现')
    },
    attachment: async () => {
      const accept = uploadCfg.value.fileAccept ?? '*'
      const files = await fileInsert.pickFiles(accept, false)
      if (!files[0]) return
      const ok = await fileInsert.insertAttachmentFromFile(files[0])
      if (!ok) message.error('附件插入失败，请检查上传配置')
    },
    note: () => {
      message.info('备注待实现')
    },
    formula: ({ sheet, anchor }) => {
      if (!sheet) return
      formulaEdit.pickFunction(sheet, anchor.r, anchor.c, 'SUM')
    },
    insertRowAbove: ({ sheet, anchor }) => {
      sheet?.chain().insertRows({ at: anchor.r, count: 1 }).run()
    },
    insertRowBelow: ({ sheet, anchor }) => {
      sheet?.chain().insertRows({ at: anchor.r + 1, count: 1 }).run()
    },
    insertColLeft: ({ sheet, anchor }) => {
      sheet?.chain().insertCols({ at: anchor.c, count: 1 }).run()
    },
    insertColRight: ({ sheet, anchor }) => {
      sheet?.chain().insertCols({ at: anchor.c + 1, count: 1 }).run()
    },
  }

  function runAction(key: string, ctx: InsertMenuActionContext): void | Promise<void> {
    const fn = actions[key]
    if (!fn) return
    return fn(ctx)
  }

  function registerAction(
    key: string,
    override?: InsertMenuAction,
  ): InsertMenuAction | undefined {
    return override ?? ((ctx) => runAction(key, ctx))
  }

  function runFormulaPick(name: string, ctx: InsertMenuActionContext): void {
    const s = ctx.sheet
    if (!s) return
    formulaEdit.pickFunction(s, ctx.anchor.r, ctx.anchor.c, name)
  }

  return {
    actions,
    runAction,
    registerAction,
    runFormulaPick,
    formulaFeatured: getFeaturedBuiltins,
    formulaCategories: getCategoriesWithBuiltins,
    formulaByCategory: getBuiltinsByCategory,
    categoryLabel,
    sheetLocale,
  }
}

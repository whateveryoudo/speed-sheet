import { Extension, type CommandContext } from '@speed-sheet/core'
import type { SheetImageItem } from '@speed-sheet/shared'
import { removeSheetImagesInSelection } from './selection'

export const IMAGE_EXTENSION_NAME = 'sheetImage'

export interface SheetImageExtensionStorage {
  /** 由 Layer NodeView 注册，供 downloadSheetImage 命令调用 */
  downloadImage?: (fileId: string) => void
}

function newImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const ImageExtension = Extension.create<SheetImageExtensionStorage>({
  name: IMAGE_EXTENSION_NAME,
  priority: -44,

  addStorage() {
    return {}
  },

  addCommands() {
    return {
      insertSheetImage: (props: {
        r: number
        c: number
        src: string
        width: number
        height: number
        originWidth?: number
        originHeight?: number
        id?: string
        offsetLeft?: number
        offsetTop?: number
      }) => {
        return ({ state }: CommandContext) => {
          // 插入图片时清空单元格文本/公式，避免删图后旧内容 resurfacing
          if (state.getImagesAtCell(props.r, props.c).length === 0) {
            state.deleteCell(props.r, props.c)
          }
          const item: SheetImageItem = {
            id: props.id ?? newImageId(),
            src: props.src,
            row: props.r,
            col: props.c,
            width: props.width,
            height: props.height,
            originWidth: props.originWidth ?? props.width,
            originHeight: props.originHeight ?? props.height,
            offsetLeft: props.offsetLeft ?? 2,
            offsetTop: props.offsetTop ?? 2,
          }
          state.setImage(item)
          return true
        }
      },

      removeSheetImage: (props: { id: string }) => {
        return ({ state }: CommandContext) => {
          state.deleteImage(props.id)
          return true
        }
      },

      /** 触发 Layer 注册的下载（对标 tiptap attachment:download） */
      downloadSheetImage: (props: { id: string }) => {
        return () => {
          this.storage.downloadImage?.(props.id)
          return true
        }
      },
    }
  },

  addKeyboardShortcuts({ sheet }) {
    const remove = () => removeSheetImagesInSelection(sheet)
    return {
      Backspace: remove,
      Delete: remove,
    }
  },
})

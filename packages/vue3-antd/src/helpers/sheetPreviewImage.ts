import type { Sheet } from '@speed-sheet/core'
import Viewer from 'viewerjs'
import 'viewerjs/dist/viewer.css'

/**
 * 表格浮动图预览（对标 speed-tiptap-editor/src/helpers/previews.ts EditorPreviewImage）
 * - 每次 previewImage 收集当前 sheet 全部图片 src
 * - Viewer 多图时可 prev/next 切换
 */
export class SheetPreviewImage {
  private viewerInstance: Viewer | null = null
  private previewContainer: HTMLElement | null = null
  private getSheet: () => Sheet | null

  constructor(getSheet: () => Sheet | null) {
    this.getSheet = getSheet
  }

  /** 当前工作簿内所有浮动图 src（对标 editor.state.doc 遍历 image 节点） */
  getAllImageSrcs(): string[] {
    const sheet = this.getSheet()
    if (!sheet) return []
    const srcs: string[] = []
    for (const img of sheet.state.getAllImages()) {
      if (img.src) srcs.push(img.src)
    }
    return srcs
  }

  destroy(): void {
    if (this.viewerInstance) {
      this.viewerInstance.destroy()
      this.viewerInstance = null
    }
    if (this.previewContainer) {
      this.previewContainer.remove()
      this.previewContainer = null
    }
  }

  private initViewer(imageSrcs: string[]): void {
    if (this.viewerInstance) {
      this.viewerInstance.destroy()
      this.viewerInstance = null
    }
    if (!this.previewContainer) {
      this.previewContainer = document.createElement('div')
      this.previewContainer.style.display = 'none'
      document.body.appendChild(this.previewContainer)
    }
    this.previewContainer.innerHTML = ''
    for (const src of imageSrcs) {
      if (!src) continue
      const img = document.createElement('img')
      img.src = src
      this.previewContainer.appendChild(img)
    }
    this.viewerInstance = new Viewer(this.previewContainer, {
      inline: false,
      navbar: imageSrcs.length > 1,
      toolbar: {
        zoomIn: true,
        zoomOut: true,
        oneToOne: true,
        reset: true,
        prev: imageSrcs.length > 1,
        next: imageSrcs.length > 1,
        rotateLeft: true,
        rotateRight: true,
        flipHorizontal: true,
        flipVertical: true,
      },
    })
  }

  previewImage = (src: string): void => {
    const srcs = this.getAllImageSrcs()
    if (!srcs.length) return
    this.initViewer(srcs)
    const index = srcs.findIndex((item) => item === src)
    if (index !== -1 && this.viewerInstance) {
      this.viewerInstance.view(index)
    }
  }
}

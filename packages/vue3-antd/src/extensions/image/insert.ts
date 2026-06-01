import type { Ref } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import type { CellAttachmentMeta } from '@speed-sheet/shared'
import {
  fitImageToCell,
  SHEET_IMAGE_CELL_INSET,
} from '@speed-sheet/extension-image'
import { useSheetUploadConfig } from '@speed-sheet/vue3'

const STACK_GAP = 12

function loadImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () =>
      resolve({
        width: img.naturalWidth || 120,
        height: img.naturalHeight || 80,
      })
    img.onerror = () => reject(new Error('image load failed'))
    img.src = src
  })
}

export function useSheetImageInsert(options: {
  sheet: Ref<Sheet | null>
  getAnchor: () => { r: number; c: number }
  getCellSize: (r: number, c: number) => { w: number; h: number }
}) {
  const uploadCfgRef = useSheetUploadConfig()
  const uploadCfg = () => uploadCfgRef.value

  async function uploadFile(file: File): Promise<CellAttachmentMeta | null> {
    const api = uploadCfg().apis?.fileUploadSingle
    if (!api) return null
    const fd = new FormData()
    fd.append('file', file)
    const res = await api(fd)
    const transform = uploadCfg().transformFileItem
    const item = transform ? transform((res as { data?: unknown })?.data ?? res) : (res as { data?: CellAttachmentMeta })?.data
    if (!item?.id) return null
    const previewUrl = uploadCfg().apis?.getPreviewUrl?.(item.id)
    return {
      id: item.id,
      fileName: item.fileName,
      fileType: item.fileType,
      fileSize: item.fileSize,
      previewUrl: previewUrl ?? item.previewUrl,
    }
  }

  async function insertImageFromFile(
    file: File,
    stackIndex = 0,
  ): Promise<boolean> {
    const s = options.sheet.value
    if (!s) return false
    const { r, c } = options.getAnchor()
    const { w: cellW, h: cellH } = options.getCellSize(r, c)
    const innerW = Math.max(24, cellW - SHEET_IMAGE_CELL_INSET * 2)
    const innerH = Math.max(24, cellH - SHEET_IMAGE_CELL_INSET * 2)

    let src = ''
    let fileId: string | undefined

    if (uploadCfg().apis?.fileUploadSingle) {
      const att = await uploadFile(file)
      if (!att?.id) return false
      fileId = att.id
      src = att.previewUrl ?? uploadCfg().apis?.getPreviewUrl?.(att.id) ?? ''
      if (!src) return false
    } else {
      src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
    }

    const natural = await loadImageSize(src)
    const { width, height } = fitImageToCell(natural.width, natural.height, innerW, innerH)
    const offset = SHEET_IMAGE_CELL_INSET + stackIndex * STACK_GAP
    s.chain()
      .insertSheetImage({
        r,
        c,
        src,
        id: fileId,
        width,
        height,
        originWidth: natural.width,
        originHeight: natural.height,
        offsetLeft: offset,
        offsetTop: offset,
      })
      .run()
    return true
  }

  /** 多图插入（对齐 tiptap uploadImage 批量 insertContent） */
  async function insertImagesFromFiles(files: File[]): Promise<number> {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'))
    if (!imageFiles.length) return 0
    const s = options.sheet.value
    if (!s) return 0
    const { r, c } = options.getAnchor()
    const existing = s.state.getImagesAtCell(r, c)
    let ok = 0
    for (let i = 0; i < imageFiles.length; i++) {
      const stackIndex = existing.length + i
      if (await insertImageFromFile(imageFiles[i], stackIndex)) ok++
    }
    return ok
  }

  return {
    insertImageFromFile,
    insertImagesFromFiles,
    uploadCfg: uploadCfgRef,
  }
}

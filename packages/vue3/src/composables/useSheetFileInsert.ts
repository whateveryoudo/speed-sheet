import type { Ref } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import type { CellAttachmentMeta } from '@speed-sheet/shared'
import { useSheetUploadConfig } from './useSheetUploadContext'

export function useSheetFileInsert(options: {
  sheet: Ref<Sheet | null | undefined>
  getAnchor: () => { r: number; c: number }
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

  async function insertAttachmentFromFile(file: File): Promise<boolean> {
    const s = options.sheet.value
    if (!s) return false
    const { r, c } = options.getAnchor()
    let att = await uploadFile(file)
    if (!att && uploadCfg().apis?.fileUploadSingle) return false
    if (!att) {
      att = {
        id: `local_${Date.now()}`,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }
    }
    s.chain().insertCellAttachment({ r, c, attachment: att }).run()
    return true
  }

  function insertCheckbox(): void {
    const s = options.sheet.value
    if (!s) return
    const { r, c } = options.getAnchor()
    s.chain().insertCheckbox({ r, c, checked: false }).run()
  }

  function pickFiles(accept: string, multiple: boolean): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = accept
      input.multiple = multiple
      input.onchange = () => {
        resolve(Array.from(input.files ?? []))
        input.remove()
      }
      input.click()
    })
  }

  return {
    insertCheckbox,
    insertAttachmentFromFile,
    pickFiles,
    uploadCfg: uploadCfgRef,
  }
}

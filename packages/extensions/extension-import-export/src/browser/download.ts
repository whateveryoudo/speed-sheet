/**
 * 浏览器端文件下载与文件选择辅助工具
 */

export function downloadBlob(
  data: Uint8Array | ArrayBuffer | Blob | string,
  filename: string,
  mimeType = 'application/octet-stream',
): void {
  if (typeof window === 'undefined' || !window.document) {
    throw new Error('downloadBlob can only be executed in a browser environment')
  }

  let blob: Blob
  if (data instanceof Blob) {
    blob = data
  } else if (typeof data === 'string') {
    blob = new Blob([data], { type: mimeType })
  } else {
    blob = new Blob([data as any], { type: mimeType })
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function promptSelectFile(accept = '.xlsx,.speedsheet,.csv'): Promise<File | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.document) {
      resolve(null)
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'

    input.onchange = () => {
      const file = input.files?.[0] ?? null
      document.body.removeChild(input)
      resolve(file)
    }

    input.oncancel = () => {
      document.body.removeChild(input)
      resolve(null)
    }

    document.body.appendChild(input)
    input.click()
  })
}

import { Extension } from '../Extension'
import type { CommandContext } from '../types'
import type { CellAttributes, Selection } from '@speed-sheet/shared'
import { transactUser } from '../../yjs/transact'

export interface ClipboardPayload {
  row: [number, number]
  column: [number, number]
  cells: Array<{ dr: number; dc: number; data: CellAttributes }>
}

function normalizeSelection(sel: Selection): {
  r0: number
  r1: number
  c0: number
  c1: number
} {
  return {
    r0: Math.min(sel.row[0], sel.row[1]),
    r1: Math.max(sel.row[0], sel.row[1]),
    c0: Math.min(sel.column[0], sel.column[1]),
    c1: Math.max(sel.column[0], sel.column[1]),
  }
}

function cloneCell(data: CellAttributes): CellAttributes {
  return JSON.parse(JSON.stringify(data)) as CellAttributes
}

export function rangeToTsv(state: CommandContext['state'], sel: Selection): string {
  const { r0, r1, c0, c1 } = normalizeSelection(sel)
  const rows: string[] = []
  for (let r = r0; r <= r1; r++) {
    const rowCells: string[] = []
    for (let c = c0; c <= c1; c++) {
      const data = state.getCellData(r, c)
      const text = data?.m ?? (data?.v != null ? String(data.v) : '')
      // 如果包含换行或制表符或双引号，需使用双引号包裹并转义
      if (text.includes('\t') || text.includes('\n') || text.includes('"')) {
        rowCells.push(`"${text.replace(/"/g, '""')}"`)
      } else {
        rowCells.push(text)
      }
    }
    rows.push(rowCells.join('\t'))
  }
  return rows.join('\n')
}

export function rangeToHtml(state: CommandContext['state'], sel: Selection): string {
  const { r0, r1, c0, c1 } = normalizeSelection(sel)
  let html = '<table>'
  for (let r = r0; r <= r1; r++) {
    html += '<tr>'
    for (let c = c0; c <= c1; c++) {
      const data = state.getCellData(r, c)
      const text = data?.m ?? (data?.v != null ? String(data.v) : '')
      const styleParts: string[] = []
      if (data?.bg) styleParts.push(`background-color:${data.bg}`)
      if (data?.fc) styleParts.push(`color:${data.fc}`)
      if (data?.bl) styleParts.push('font-weight:bold')
      if (data?.it) styleParts.push('font-style:italic')
      const styleAttr = styleParts.length ? ` style="${styleParts.join(';')}"` : ''
      html += `<td${styleAttr}>${escapeHtml(text)}</td>`
    }
    html += '</tr>'
  }
  html += '</table>'
  return html
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 解析制表符分割或换行分割的纯文本为二维数组 */
export function parseTsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  // 如果末尾有多余空行，去掉
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  return lines.map((line) => {
    // 处理带双引号的单元格转义
    const cells: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === '\t' && !inQuotes) {
        cells.push(current)
        current = ''
      } else {
        current += char
      }
    }
    cells.push(current)
    return cells
  })
}

/** 写入系统剪贴板（如在支持的环境下） */
export async function writeSystemClipboard(tsv: string, html: string): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return
  try {
    if (typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({
        'text/plain': new Blob([tsv], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })
      await navigator.clipboard.write([item])
    } else {
      await navigator.clipboard.writeText(tsv)
    }
  } catch {
    // 降级使用 writeText
    try {
      await navigator.clipboard.writeText(tsv)
    } catch {
      // 忽略剪贴板写入权限错误
    }
  }
}

function readRange(state: CommandContext['state'], sel: Selection): ClipboardPayload {
  const { r0, r1, c0, c1 } = normalizeSelection(sel)
  const cells: ClipboardPayload['cells'] = []
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const data = state.getCellData(r, c)
      if (data) {
        cells.push({ dr: r - r0, dc: c - c0, data: cloneCell(data) })
      }
    }
  }
  return { row: [r0, r1], column: [c0, c1], cells }
}

export const ClipboardExtension = Extension.create({
  name: 'clipboard',
  priority: -97,

  addStorage() {
    return {
      copied: null as ClipboardPayload | null,
      isCut: false,
    }
  },

  addCommands() {
    return {
      copy: () => {
        return ({ state }: CommandContext) => {
          const sel = state.getSelection()
          const payload = readRange(state, sel)
          this.storage.copied = payload
          this.storage.isCut = false

          // 同步写入系统剪贴板（TSV 与 HTML 格式）
          const tsv = rangeToTsv(state, sel)
          const html = rangeToHtml(state, sel)
          void writeSystemClipboard(tsv, html)

          return true
        }
      },
      cut: () => {
        return ({ state }: CommandContext) => {
          const sel = state.getSelection()
          const payload = readRange(state, sel)
          this.storage.copied = payload
          this.storage.isCut = true

          // 同步写入系统剪贴板（TSV 与 HTML 格式）
          const tsv = rangeToTsv(state, sel)
          const html = rangeToHtml(state, sel)
          void writeSystemClipboard(tsv, html)

          const { r0, r1, c0, c1 } = normalizeSelection(sel)
          if (state.root.doc) {
            transactUser(state.root.doc, () => {
              for (let r = r0; r <= r1; r++) {
                for (let c = c0; c <= c1; c++) {
                  state.deleteCell(r, c)
                }
              }
            })
          }
          return true
        }
      },
      paste: () => {
        return ({ state }: CommandContext) => {
          const clip = this.storage.copied
          if (!clip) return false

          const anchor = normalizeSelection(state.getSelection())
          const ar = anchor.r0
          const ac = anchor.c0

          if (state.root.doc) {
            transactUser(state.root.doc, () => {
              for (const { dr, dc, data } of clip.cells) {
                state.setCell(ar + dr, ac + dc, cloneCell(data))
              }
            })
          }

          if (this.storage.isCut) {
            this.storage.isCut = false
            this.storage.copied = null
          }
          return true
        }
      },
      pasteText: (props: { text: string }) => {
        return ({ state }: CommandContext) => {
          if (!props.text) return false
          const matrix = parseTsv(props.text)
          if (!matrix.length) return false

          const anchor = normalizeSelection(state.getSelection())
          const ar = anchor.r0
          const ac = anchor.c0

          if (state.root.doc) {
            transactUser(state.root.doc, () => {
              for (let r = 0; r < matrix.length; r++) {
                const row = matrix[r]
                for (let c = 0; c < row.length; c++) {
                  const val = row[c]
                  // 如果是纯数字，转为数字存储
                  const num = Number(val)
                  const isNum = val.trim() !== '' && !Number.isNaN(num)
                  state.setCell(ar + r, ac + c, {
                    v: isNum ? num : val,
                    m: val,
                  })
                }
              }
            })
          }
          return true
        }
      },
    }
  },
})

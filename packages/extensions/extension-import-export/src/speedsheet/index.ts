import type { WorkbookSnapshot } from '@speed-sheet/shared'

export interface SpeedSheetFile {
  magic: 'SPEED_SHEET'
  version: number
  exportedAt: string
  title?: string
  metadata?: Record<string, unknown>
  snapshot: WorkbookSnapshot
}

/**
 * 将 WorkbookSnapshot 无损导出为本站专属 .speedsheet JSON 字符串
 */
export function exportSnapshotToSpeedSheet(
  snapshot: WorkbookSnapshot,
  options?: {
    title?: string
    metadata?: Record<string, unknown>
    pretty?: boolean
  },
): string {
  const file: SpeedSheetFile = {
    magic: 'SPEED_SHEET',
    version: 1,
    exportedAt: new Date().toISOString(),
    title: options?.title,
    metadata: options?.metadata,
    snapshot,
  }

  return options?.pretty ? JSON.stringify(file, null, 2) : JSON.stringify(file)
}

/**
 * 将 .speedsheet 文件内容或 JSON 转换为 WorkbookSnapshot
 */
export function importSpeedSheetToSnapshot(content: string | Record<string, any>): WorkbookSnapshot {
  let parsed: any = content
  if (typeof content === 'string') {
    try {
      parsed = JSON.parse(content)
    } catch (e) {
      throw new Error(`Invalid .speedsheet JSON format: ${(e as Error).message}`)
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid .speedsheet content: not an object')
  }

  // 1. 如果是标准的包装对象 { magic: 'SPEED_SHEET', snapshot: ... }
  if (parsed.magic === 'SPEED_SHEET' && parsed.snapshot) {
    return parsed.snapshot as WorkbookSnapshot
  }

  // 2. 如果直接传入的就是一个 WorkbookSnapshot (兼容直接传入 snapshot 场景)
  if (Array.isArray(parsed.sheets) && (parsed.activeSheetId || parsed.sheets.length > 0)) {
    return parsed as WorkbookSnapshot
  }

  throw new Error('Invalid .speedsheet structure: missing snapshot or sheets')
}

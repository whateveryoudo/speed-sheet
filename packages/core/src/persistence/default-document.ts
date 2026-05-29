import * as Y from 'yjs'
import type { WorkbookSnapshot } from '@speed-sheet/shared'
import { Sheet } from '../Sheet'
import { DEFAULT_COL_COUNT, DEFAULT_ROW_COUNT } from '../state/sheet-layout'

export interface CreateDefaultDocumentContentOptions {
  /** First sheet display name (default: Sheet1) */
  sheetName?: string
}

export interface DefaultDocumentContent {
  /** Yjs update bytes for `document_content.content` */
  content: Uint8Array
  snapshot: WorkbookSnapshot
  /** JSON string for `document_content.node_json` */
  nodeJson: string
}

/**
 * Headless empty workbook: Sheet1 + DEFAULT_ROW_COUNT × DEFAULT_COL_COUNT grid.
 * Same shape as `new Sheet()` in the browser without snapshot/data props.
 */
export function createDefaultWorkbookSnapshot(
  options?: CreateDefaultDocumentContentOptions,
): WorkbookSnapshot {
  const sheet = new Sheet()
  try {
    const snapshot = sheet.toSnapshot()
    const first = snapshot.sheets[0]
    if (first && options?.sheetName) {
      first.name = options.sheetName
    }
    return snapshot
  } finally {
    sheet.destroy()
  }
}

/**
 * Initial `content` + `node_json` for a new spreadsheet document (platform create-default).
 */
export function createDefaultDocumentContent(
  options?: CreateDefaultDocumentContentOptions,
): DefaultDocumentContent {
  const sheet = new Sheet()
  try {
    if (options?.sheetName) {
      const sheetsMap = sheet.getYDoc().getMap('sheets')
      const firstId = snapshotSheetId(sheet)
      const ySheet = sheetsMap.get(firstId) as Y.Map<unknown> | undefined
      if (ySheet) {
        ySheet.set('name', options.sheetName)
      }
    }

    const snapshot = sheet.toSnapshot()
    return {
      content: Y.encodeStateAsUpdate(sheet.getYDoc()),
      snapshot,
      nodeJson: JSON.stringify(snapshot),
    }
  } finally {
    sheet.destroy()
  }
}

function snapshotSheetId(sheet: Sheet): string {
  const sheetsMap = sheet.getYDoc().getMap('sheets')
  const first = sheetsMap.keys().next().value
  return (first as string | undefined) ?? '0'
}

export { DEFAULT_ROW_COUNT, DEFAULT_COL_COUNT }

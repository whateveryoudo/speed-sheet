import { describe, expect, it } from 'vitest'
import {
  createDefaultDocumentContent,
  createDefaultWorkbookSnapshot,
  DEFAULT_COL_COUNT,
  DEFAULT_ROW_COUNT,
} from '../persistence/default-document'
import * as Y from 'yjs'
import { Sheet } from '../Sheet'

describe('createDefaultDocumentContent', () => {
  it('produces 200×26 grid snapshot and valid Y content', () => {
    const { content, snapshot, nodeJson } = createDefaultDocumentContent()

    expect(snapshot.version).toBe(2)
    expect(snapshot.sheets).toHaveLength(1)
    expect(snapshot.sheets[0]?.name).toBe('Sheet1')
    expect(snapshot.sheets[0]?.rowOrder).toHaveLength(DEFAULT_ROW_COUNT)
    expect(snapshot.sheets[0]?.colOrder).toHaveLength(DEFAULT_COL_COUNT)
    expect(snapshot.activeSheetId).toBe(snapshot.sheets[0]?.id)

    expect(content.length).toBeGreaterThan(0)
    expect(JSON.parse(nodeJson)).toEqual(snapshot)

    const ydoc = new Y.Doc()
    Y.applyUpdate(ydoc, content)
    const sheet = new Sheet({ ydoc })
    expect(sheet.toSnapshot().sheets[0]?.rowOrder.length).toBe(DEFAULT_ROW_COUNT)
    sheet.destroy()
  })

  it('createDefaultWorkbookSnapshot respects sheetName', () => {
    const snap = createDefaultWorkbookSnapshot({ sheetName: '销售表' })
    expect(snap.sheets[0]?.name).toBe('销售表')
  })
})

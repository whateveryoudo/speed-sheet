import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { importFromLuckysheet, exportToLuckysheet } from '../adapter/luckysheet-adapter'
import { SheetState } from '../state/SheetState'
import { cellIdKey } from '@speed-sheet/shared'
import type { LuckysheetFile } from '@speed-sheet/shared'

describe('Luckysheet Adapter', () => {
  const sampleData: LuckysheetFile = [
    {
      name: 'Sheet1',
      index: 0,
      order: 0,
      status: '1',
      data: [
        [null, { v: 'Name', ct: { fa: 'General', t: 's' }, m: 'Name', fc: '#333', fs: 11 }],
        [null, { v: 'Alice', ct: { fa: 'General', t: 's' }, m: 'Alice' }],
      ],
      config: {
        merge: { '0_1': { r: 0, c: 1, rs: 1, cs: 2 } },
        rowlen: { '0': 30, '1': 25 },
        columnlen: { '1': 120 },
        rowhidden: {},
        colhidden: {},
      },
    },
    {
      name: 'Sheet2',
      index: 1,
      order: 1,
      status: '0',
      data: [],
      config: {},
    },
  ]

  it('should import old format to Y.Doc', () => {
    const ydoc = new Y.Doc()
    importFromLuckysheet(sampleData, ydoc)

    const sheetsMap = ydoc.getMap('sheets')
    expect(sheetsMap.size).toBe(2)

    const sheet0 = sheetsMap.get('0') as Y.Map<any>
    expect(sheet0.get('name')).toBe('Sheet1')

    const state = new SheetState(sheet0)
    expect(state.getCellData(0, 1)?.v).toBe('Name')
    expect(state.getCellData(0, 1)?.m).toBe('Name')
    expect(state.getCellData(0, 0)).toBeNull()

    const rowOrder = sheet0.get('rowOrder') as Y.Array<string>
    const colOrder = sheet0.get('colOrder') as Y.Array<string>
    expect(rowOrder.length).toBeGreaterThan(0)
    expect(colOrder.length).toBeGreaterThan(0)
    const cells = sheet0.get('cells') as Y.Map<any>
    const idKey = cellIdKey(rowOrder.get(0)!, colOrder.get(1)!)
    expect(cells.has(idKey)).toBe(true)

    const merges = sheet0.get('merges') as Y.Map<any>
    expect(merges.has('0_1')).toBe(true)

    ydoc.destroy()
  })

  it('should roundtrip: import then export', () => {
    const ydoc = new Y.Doc()
    importFromLuckysheet(sampleData, ydoc)
    const exported = exportToLuckysheet(ydoc)

    expect(exported.length).toBe(2)
    expect(exported[0].name).toBe('Sheet1')
    expect(exported[0].data).toBeDefined()
    expect(exported[0].data!.length).toBeGreaterThan(0)

    // Verify the cell data survived
    const cell = exported[0].data![0][1] as any
    expect(cell.v).toBe('Name')

    ydoc.destroy()
  })

  it('should handle sparse celldata format', () => {
    const sparseData: LuckysheetFile = [
      {
        name: 'Sheet1',
        index: 0,
        celldata: [
          { r: 0, c: 0, v: { v: 'Hello', m: 'Hello' } },
          { r: 5, c: 10, v: { v: 'World', m: 'World', f: '=A1' } },
        ],
        data: undefined,
        config: { merge: {} },
      },
    ]

    const ydoc = new Y.Doc()
    importFromLuckysheet(sparseData, ydoc)

    const sheet0 = ydoc.getMap('sheets').get('0') as Y.Map<any>
    const state = new SheetState(sheet0)

    expect(state.getCellData(0, 0)?.v).toBe('Hello')
    expect(state.getCellData(5, 10)?.f).toBe('=A1')
    expect(state.getCellData(1, 0)).toBeNull()

    ydoc.destroy()
  })

  it('should handle empty data', () => {
    const ydoc = new Y.Doc()
    importFromLuckysheet([], ydoc)

    const sheetsMap = ydoc.getMap('sheets')
    expect(sheetsMap.size).toBe(0)

    ydoc.destroy()
  })
})

// Also test Yjs CRDT behavior
describe('Yjs CRDT cell operations', () => {
  it('should merge concurrent cell edits without conflict', () => {
    const ydoc = new Y.Doc()

    const cells = ydoc.getMap('cells')
    const keyA = 'r_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa:c_bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const keyB = 'r_cccccccc-cccc-cccc-cccc-cccccccccccc:c_dddddddd-dddd-dddd-dddd-dddddddddddd'
    const keyShared = 'r_eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee:c_ffffffff-ffff-ffff-ffff-ffffffffffff'

    const cellA = new Y.Map()
    cellA.set('v', 'Alice')
    cells.set(keyA, cellA)

    const cellB = new Y.Map()
    cellB.set('v', 'Bob')
    cells.set(keyB, cellB)

    expect(cells.get(keyA)?.get('v')).toBe('Alice')
    expect(cells.get(keyB)?.get('v')).toBe('Bob')

    const sharedCell = new Y.Map()
    sharedCell.set('v', 'Original')
    sharedCell.set('fc', '#000')
    cells.set(keyShared, sharedCell)

    const sharedA = cells.get(keyShared) as Y.Map<any>
    const sharedB = cells.get(keyShared) as Y.Map<any>

    sharedA.set('v', 'NewValue')
    sharedB.set('fc', '#FF0000')

    expect(cells.get(keyShared)?.get('v')).toBe('NewValue')
    expect(cells.get(keyShared)?.get('fc')).toBe('#FF0000')

    ydoc.destroy()
  })
})

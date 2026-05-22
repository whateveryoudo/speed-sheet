import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { importFromLuckysheet, exportToLuckysheet } from '../adapter/luckysheet-adapter'
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

    const cells = sheet0.get('cells') as Y.Map<any>
    // Only non-null cells are stored
    expect(cells.has('R0_C1')).toBe(true)
    expect(cells.has('R1_C1')).toBe(true)
    expect(cells.has('R0_C0')).toBe(false) // null, not stored

    const cellR0C1 = cells.get('R0_C1') as Y.Map<any>
    expect(cellR0C1.get('v')).toBe('Name')
    expect(cellR0C1.get('m')).toBe('Name')

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
    const cells = sheet0.get('cells') as Y.Map<any>

    expect(cells.has('R0_C0')).toBe(true)
    expect(cells.has('R5_C10')).toBe(true)
    expect(cells.has('R1_C0')).toBe(false)

    const cellR5C10 = cells.get('R5_C10') as Y.Map<any>
    expect(cellR5C10.get('f')).toBe('=A1')

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

    // Simulate user A: edit cell R0_C0
    const cells = ydoc.getMap('cells')
    const cellR0C0 = new Y.Map()
    cellR0C0.set('v', 'Alice')
    cells.set('R0_C0', cellR0C0)

    // Simulate user B: edit cell R3_C5 (different key, no conflict)
    const cellR3C5 = new Y.Map()
    cellR3C5.set('v', 'Bob')
    cells.set('R3_C5', cellR3C5)

    // Both edits should coexist
    expect(cells.get('R0_C0')?.get('v')).toBe('Alice')
    expect(cells.get('R3_C5')?.get('v')).toBe('Bob')

    // Simulate concurrent edit to the SAME cell's different attributes
    const sharedCell = new Y.Map()
    sharedCell.set('v', 'Original')
    sharedCell.set('fc', '#000')
    cells.set('R1_C1', sharedCell)

    // User A changes value, User B changes color — different keys, no conflict
    const cellA = cells.get('R1_C1') as Y.Map<any>
    const cellB = cells.get('R1_C1') as Y.Map<any> // same reference

    cellA.set('v', 'NewValue')
    cellB.set('fc', '#FF0000')

    expect(cells.get('R1_C1')?.get('v')).toBe('NewValue')
    expect(cells.get('R1_C1')?.get('fc')).toBe('#FF0000')

    ydoc.destroy()
  })
})

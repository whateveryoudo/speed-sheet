import { useCallback, useEffect, useState } from 'react'
import { Sheet, type SheetOptions, type LuckysheetFile, type WorkbookSnapshot, type Selection } from '@speed-sheet/core'

export interface UseSheetReturn {
  sheet: Sheet | null
  isReady: boolean
  selection: Selection
  activeSheetId: string
  sheetNames: string[]
  allCells: Array<{ r: number; c: number; data: any }>
  switchSheet: (id: string) => void
  toSnapshot: () => WorkbookSnapshot | null
  toLuckysheetFile: () => LuckysheetFile | null
}

export function useSheet(options: SheetOptions = {}): UseSheetReturn {
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [selection, setSelection] = useState<Selection>({ row: [0, 0], column: [0, 0] })
  const [activeSheetId, setActiveSheetId] = useState('0')
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [allCells, setAllCells] = useState<Array<{ r: number; c: number; data: any }>>([])

  const refreshState = useCallback((s: Sheet) => {
    setSelection(s.state.getSelection())
    setSheetNames(Array.from(s.getYDoc().getMap('sheets').keys()))
    setAllCells(s.state.getAllCells())
  }, [])

  useEffect(() => {
    const instance = new Sheet({
      ...options,
      onUpdate: (s) => refreshState(s),
    })
    setSheet(instance)
    setIsReady(true)
    refreshState(instance)

    return () => {
      instance.destroy()
      setSheet(null)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- single mount workbook

  const switchSheet = useCallback((id: string) => {
    sheet?.switchSheet(id)
    setActiveSheetId(id)
    if (sheet) refreshState(sheet)
  }, [refreshState, sheet])

  const toSnapshot = useCallback(() => sheet?.toSnapshot() ?? null, [sheet])
  const toLuckysheetFile = useCallback(() => sheet?.toLuckysheetFile() ?? null, [sheet])

  return {
    sheet,
    isReady,
    selection,
    activeSheetId,
    sheetNames,
    allCells,
    switchSheet,
    toSnapshot,
    toLuckysheetFile,
  }
}

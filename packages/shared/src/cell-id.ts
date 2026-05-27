/** Separator for stable cell storage keys: `rowId:colId` */
export const CELL_ID_SEP = ':'

export function cellIdKey(rowId: string, colId: string): string {
  return `${rowId}${CELL_ID_SEP}${colId}`
}

export function parseCellIdKey(key: string): { rowId: string; colId: string } | null {
  const i = key.indexOf(CELL_ID_SEP)
  if (i <= 0 || i === key.length - 1) return null
  return { rowId: key.slice(0, i), colId: key.slice(i + 1) }
}

/** Dependency / visit key: `sheetId:rowId:colId` */
export function depKey(sheetId: string, rowId: string, colId: string): string {
  return `${sheetId}${CELL_ID_SEP}${rowId}${CELL_ID_SEP}${colId}`
}

export function parseDepKey(key: string): { sheetId: string; rowId: string; colId: string } | null {
  const parts = key.split(CELL_ID_SEP)
  if (parts.length !== 3) return null
  const [sheetId, rowId, colId] = parts
  if (!sheetId || !rowId || !colId) return null
  return { sheetId, rowId, colId }
}

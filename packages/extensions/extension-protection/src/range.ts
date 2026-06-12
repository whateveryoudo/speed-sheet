import type { ProtectionEntry, ProtectionKind } from './types'

export interface NormalizedRect {
  r0: number
  r1: number
  c0: number
  c1: number
}

export function normalizeRect(row: [number, number], column: [number, number]): NormalizedRect {
  return {
    r0: Math.min(row[0], row[1]),
    r1: Math.max(row[0], row[1]),
    c0: Math.min(column[0], column[1]),
    c1: Math.max(column[0], column[1]),
  }
}

export function normalizeEntryBounds(entry: ProtectionEntry): NormalizedRect {
  return normalizeRect(entry.row, entry.column)
}

export function rectsOverlap(a: NormalizedRect, b: NormalizedRect): boolean {
  return a.r0 <= b.r1 && a.r1 >= b.r0 && a.c0 <= b.c1 && a.c1 >= b.c0
}

export function entryCoversCell(entry: ProtectionEntry, r: number, c: number): boolean {
  const rect = normalizeEntryBounds(entry)
  return r >= rect.r0 && r <= rect.r1 && c >= rect.c0 && c <= rect.c1
}

export function isCellProtected(
  entries: ProtectionEntry[],
  r: number,
  c: number,
): boolean {
  return entries.some((entry) => entryCoversCell(entry, r, c))
}

export function rangeOverlapsProtection(
  entries: ProtectionEntry[],
  r0: number,
  r1: number,
  c0: number,
  c1: number,
): boolean {
  const target = normalizeRect([r0, r1], [c0, c1])
  for (const entry of entries) {
    if (rectsOverlap(target, normalizeEntryBounds(entry))) return true
  }
  return false
}

export function selectionOverlapsProtection(
  entries: ProtectionEntry[],
  row: [number, number],
  column: [number, number],
): boolean {
  const { r0, r1, c0, c1 } = normalizeRect(row, column)
  return rangeOverlapsProtection(entries, r0, r1, c0, c1)
}

export function createProtectionEntry(
  kind: ProtectionKind,
  row: [number, number],
  column: [number, number],
): ProtectionEntry {
  const rect = normalizeRect(row, column)
  return {
    id: `prot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    kind,
    row: [rect.r0, rect.r1],
    column: [rect.c0, rect.c1],
  }
}

export function rowInsertAffectsProtection(entry: ProtectionEntry, at: number): boolean {
  const rect = normalizeEntryBounds(entry)
  return at <= rect.r1
}

export function rowDeleteAffectsProtection(
  entry: ProtectionEntry,
  at: number,
  count: number,
): boolean {
  const rect = normalizeEntryBounds(entry)
  const delEnd = at + count - 1
  return at <= rect.r1 && delEnd >= rect.r0
}

export function colInsertAffectsProtection(entry: ProtectionEntry, at: number): boolean {
  const rect = normalizeEntryBounds(entry)
  return at <= rect.c1
}

export function colDeleteAffectsProtection(
  entry: ProtectionEntry,
  at: number,
  count: number,
): boolean {
  const rect = normalizeEntryBounds(entry)
  const delEnd = at + count - 1
  return at <= rect.c1 && delEnd >= rect.c0
}

export function rowMoveAffectsProtection(
  entry: ProtectionEntry,
  from: number,
  insertBefore: number,
  count: number,
): boolean {
  const rect = normalizeEntryBounds(entry)
  const fromEnd = from + count - 1
  const moveRangeOverlaps = from <= rect.r1 && fromEnd >= rect.r0
  const destOverlaps = insertBefore <= rect.r1 && insertBefore + count - 1 >= rect.r0
  return moveRangeOverlaps || destOverlaps
}

export function colMoveAffectsProtection(
  entry: ProtectionEntry,
  from: number,
  insertBefore: number,
  count: number,
): boolean {
  const rect = normalizeEntryBounds(entry)
  const fromEnd = from + count - 1
  const moveRangeOverlaps = from <= rect.c1 && fromEnd >= rect.c0
  const destOverlaps = insertBefore <= rect.c1 && insertBefore + count - 1 >= rect.c0
  return moveRangeOverlaps || destOverlaps
}

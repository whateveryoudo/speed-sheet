import * as Y from 'yjs'
import type { Sheet } from '../Sheet'
import { YOriginUser } from './origins'

/** Align with Tiptap `newGroupDelay` — merge rapid cell edits into one undo step. */
export const DEFAULT_UNDO_CAPTURE_MS = 500

export function createSheetUndoManager(ydoc: Y.Doc): Y.UndoManager {
  const sheetsMap = ydoc.getMap('sheets')
  return new Y.UndoManager([sheetsMap], {
    trackedOrigins: new Set([YOriginUser]),
    captureTimeout: DEFAULT_UNDO_CAPTURE_MS,
  })
}

export type SheetHistoryStorage = {
  undoManager: Y.UndoManager | null
}

export function getSheetUndoManager(sheet: Sheet): Y.UndoManager | null {
  const ext = sheet.extensions.find((e) => e.name === 'history')
  return (ext?.storage as SheetHistoryStorage | undefined)?.undoManager ?? null
}

export function canUndoSheet(sheet: Sheet): boolean {
  return (getSheetUndoManager(sheet)?.undoStack.length ?? 0) > 0
}

export function canRedoSheet(sheet: Sheet): boolean {
  return (getSheetUndoManager(sheet)?.redoStack.length ?? 0) > 0
}

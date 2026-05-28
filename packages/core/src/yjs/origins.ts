/** Local user edits (toolbar, canvas, commands) — tracked by UndoManager. */
export const YOriginUser = Symbol('speed-sheet-user')

/** Import, init layout, formula recalc — not tracked for undo. */
export const YOriginSystem = Symbol('speed-sheet-system')

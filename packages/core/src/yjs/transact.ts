import type * as Y from 'yjs'
import { YOriginSystem, YOriginUser } from './origins'

export function transact(doc: Y.Doc, fn: () => void, origin: symbol): void {
  doc.transact(fn, origin)
}

export function transactUser(doc: Y.Doc, fn: () => void): void {
  transact(doc, fn, YOriginUser)
}

export function transactSystem(doc: Y.Doc, fn: () => void): void {
  transact(doc, fn, YOriginSystem)
}

import type { Extension } from '@speed-sheet/core'
import type { FilterExtensionStorage } from './types'

export type GetFilterUserId = () => string | null | undefined

export function resolveFilterUserId(getUserId: GetFilterUserId | undefined): string {
  const id = getUserId?.()
  return id != null && String(id).trim() !== '' ? String(id) : 'anonymous'
}

export function getUserIdFromStorage(storage: FilterExtensionStorage): string {
  return resolveFilterUserId(storage._getUserId)
}

export function getUserIdFromExtension(ext: Extension<FilterExtensionStorage>): string {
  return resolveFilterUserId(ext.options.getCurrentUserId as GetFilterUserId | undefined)
}

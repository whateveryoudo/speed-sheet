import type { Extension, SheetOptions } from '@speed-sheet/core'
import { IMAGE_EXTENSION_NAME } from '@speed-sheet/extension-image'
import { extensionName } from '@speed-sheet/vue3'
import { SheetDropdown, DROPDOWN_EXTENSION_NAME } from '../extensions/dropdown'
import { SheetImage } from '../extensions/image'
import { SheetLink, LINK_EXTENSION_NAME } from '../extensions/link'
import { SheetNote, NOTE_EXTENSION_NAME } from '../extensions/note'
import { SheetFilter, FILTER_EXTENSION_NAME } from '../extensions/filter'

export function hasSheetImageExtension(extensions: unknown[] | undefined): boolean {
  return (extensions ?? []).some((e) => extensionName(e) === IMAGE_EXTENSION_NAME)
}

export function hasSheetDropdownExtension(extensions: unknown[] | undefined): boolean {
  return (extensions ?? []).some((e) => extensionName(e) === DROPDOWN_EXTENSION_NAME)
}

export function hasSheetLinkExtension(extensions: unknown[] | undefined): boolean {
  return (extensions ?? []).some((e) => extensionName(e) === LINK_EXTENSION_NAME)
}

export function hasSheetNoteExtension(extensions: unknown[] | undefined): boolean {
  return (extensions ?? []).some((e) => extensionName(e) === NOTE_EXTENSION_NAME)
}

export function hasSheetFilterExtension(extensions: unknown[] | undefined): boolean {
  return (extensions ?? []).some((e) => extensionName(e) === FILTER_EXTENSION_NAME)
}

/**
 * 合并 SpeedSheet 内置扩展与用户扩展（按 name 去重）。
 * 公式扩展由 useSheet → mergeBuiltinExtensions 单独合并。
 */
export function mergeSpeedSheetExtensions(
  extensions: SheetOptions['extensions'],
  filterUserId?: string | null,
): SheetOptions['extensions'] {
  const user = extensions ?? []
  const builtins: Extension[] = []
  if (!hasSheetImageExtension(user)) builtins.push(SheetImage as Extension)
  if (!hasSheetDropdownExtension(user)) builtins.push(SheetDropdown as Extension)
  if (!hasSheetLinkExtension(user)) builtins.push(SheetLink as Extension)
  if (!hasSheetNoteExtension(user)) builtins.push(SheetNote as Extension)
  if (!hasSheetFilterExtension(user)) {
    builtins.push(
      SheetFilter.extend({
        addOptions: () => ({
          getCurrentUserId: () => filterUserId ?? 'anonymous',
        }),
      }) as Extension,
    )
  }
  if (!builtins.length) return user
  return [...builtins, ...user]
}

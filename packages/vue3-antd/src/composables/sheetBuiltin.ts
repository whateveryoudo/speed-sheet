import type { Extension, SheetOptions } from '@speed-sheet/core'
import { IMAGE_EXTENSION_NAME } from '@speed-sheet/extension-image'
import { extensionName } from '@speed-sheet/vue3'
import { SheetDropdown, DROPDOWN_EXTENSION_NAME } from '../extensions/dropdown'
import { SheetImage } from '../extensions/image'

export function hasSheetImageExtension(extensions: unknown[] | undefined): boolean {
  return (extensions ?? []).some((e) => extensionName(e) === IMAGE_EXTENSION_NAME)
}

export function hasSheetDropdownExtension(extensions: unknown[] | undefined): boolean {
  return (extensions ?? []).some((e) => extensionName(e) === DROPDOWN_EXTENSION_NAME)
}

/**
 * 合并 SpeedSheet 内置扩展与用户扩展（按 name 去重）。
 * 公式扩展由 useSheet → mergeBuiltinExtensions 单独合并。
 */
export function mergeSpeedSheetExtensions(
  extensions: SheetOptions['extensions'],
): SheetOptions['extensions'] {
  const user = extensions ?? []
  const builtins: Extension[] = []
  if (!hasSheetImageExtension(user)) builtins.push(SheetImage as Extension)
  if (!hasSheetDropdownExtension(user)) builtins.push(SheetDropdown as Extension)
  if (!builtins.length) return user
  return [...builtins, ...user]
}

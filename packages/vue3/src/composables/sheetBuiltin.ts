import type { Extension, SheetOptions } from '@speed-sheet/core'
import { FormulaExtension } from '@speed-sheet/extension-formula'

export const BUILTIN_FORMULA_EXTENSION_NAME = 'formula'

export function extensionName(ext: unknown): string | undefined {
  if (typeof ext === 'object' && ext !== null && 'name' in ext) {
    return String((ext as { name: string }).name)
  }
  return undefined
}

export function hasFormulaExtension(extensions: unknown[] | undefined): boolean {
  return (extensions ?? []).some((e) => extensionName(e) === BUILTIN_FORMULA_EXTENSION_NAME)
}

/** 合并内置扩展（始终挂载公式引擎） */
export function mergeBuiltinExtensions(
  extensions: SheetOptions['extensions'],
): SheetOptions['extensions'] {
  const user = extensions ?? []
  if (hasFormulaExtension(user)) return user
  return [FormulaExtension as Extension, ...user]
}

export type UseSheetOptions = SheetOptions

export function resolveSheetOptions(options: UseSheetOptions): SheetOptions {
  const { extensions, ...rest } = options
  return {
    ...rest,
    extensions: mergeBuiltinExtensions(extensions),
  }
}

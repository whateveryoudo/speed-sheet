/**
 * 从 @formulajs/formulajs 导出 + formulajs.info 分类目录 合并为注册表。
 * 不引入平台自定义函数；UI 文案在 meta.ts 按需覆盖。
 */
import * as formulajs from '@formulajs/formulajs'
import type { FormulaBuiltinEntry, FormulaCategoryId } from './types'
import catalog from './formulajs-catalog.json'
import { defaultCategory, getMetaOverrideMap } from './meta'

type CatalogRow = { category: FormulaCategoryId; formulajs: boolean }

const catalogMap = catalog as Record<string, CatalogRow>

function getFormulajsExportNames(): string[] {
  const lib = formulajs as Record<string, unknown>
  return Object.keys(lib)
    .filter((k) => /^[A-Z][A-Z0-9_]*$/.test(k) && typeof lib[k] === 'function')
    .sort()
}

function buildEntry(name: string): FormulaBuiltinEntry | null {
  if (!catalogMap[name]) return null
  const row = catalogMap[name]
  const override = getMetaOverrideMap().get(name)
  const category = override?.category ?? row.category ?? defaultCategory()
  return {
    name,
    category,
    label: override?.label ?? name,
    labelEn: override?.labelEn,
    syntax: override?.syntax ?? `${name}(…)`,
    hint:
      override?.hint ??
      'Excel 兼容函数（@formulajs/formulajs）。说明待补充，可参考 formulajs.info。',
    description: override?.description,
    example: override?.example,
    seeAlso: override?.seeAlso,
    aliases: override?.aliases,
    implemented: override?.implemented ?? false,
    formulajs: row.formulajs,
    featured: override?.featured ?? false,
  }
}

/** 运行时注册表：仅包含 formulajs 包内存在的函数 */
export function buildFormulaBuiltinRegistry(): FormulaBuiltinEntry[] {
  const names = getFormulajsExportNames()
  const out: FormulaBuiltinEntry[] = []
  for (const name of names) {
    const entry = buildEntry(name)
    if (entry) out.push(entry)
  }
  return out
}

export const FORMULA_BUILTIN_REGISTRY: readonly FormulaBuiltinEntry[] =
  buildFormulaBuiltinRegistry()

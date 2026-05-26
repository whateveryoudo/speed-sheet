import type { FormulaCategoryId, FormulaBuiltinEntry } from './types'
import { FORMULA_BUILTIN_REGISTRY } from './buildRegistry'
import { FORMULA_CATEGORIES, categoryLabel, getCategoryMeta } from './categories'

export type { FormulaBuiltinEntry, FormulaCategoryId, FormulaCategoryMeta } from './types'
export { FORMULA_BUILTIN_REGISTRY } from './buildRegistry'
export { FORMULA_META_OVERRIDES } from './meta'
export { FORMULA_CATEGORIES, categoryLabel, getCategoryMeta } from './categories'

const _canonical = new Map<string, string>()

function rebuildCanonical(): void {
  if (_canonical.size) return
  for (const b of FORMULA_BUILTIN_REGISTRY) {
    const upper = b.name.toUpperCase()
    _canonical.set(upper, upper)
    for (const a of b.aliases ?? []) {
      _canonical.set(a.toUpperCase(), upper)
    }
  }
}

export function resolveBuiltinName(name: string): string | undefined {
  rebuildCanonical()
  return _canonical.get(name.toUpperCase())
}

export function isRegisteredBuiltin(name: string): boolean {
  rebuildCanonical()
  return _canonical.has(name.toUpperCase())
}

export function getBuiltinEntry(name: string): FormulaBuiltinEntry | undefined {
  const canonical = resolveBuiltinName(name)
  if (!canonical) return undefined
  return FORMULA_BUILTIN_REGISTRY.find((b) => b.name === canonical)
}

export function getFeaturedBuiltins(): FormulaBuiltinEntry[] {
  return FORMULA_BUILTIN_REGISTRY.filter((b) => b.featured)
}

export function getBuiltinsByCategory(category: FormulaCategoryId): FormulaBuiltinEntry[] {
  return FORMULA_BUILTIN_REGISTRY.filter((b) => b.category === category)
}

export function getImplementedBuiltins(): FormulaBuiltinEntry[] {
  return FORMULA_BUILTIN_REGISTRY.filter((b) => b.implemented)
}

export function getImplementedBuiltinNames(): string[] {
  return getImplementedBuiltins().map((b) => b.name)
}

/** 菜单用：有函数的分类（保持 FORMULA_CATEGORIES 顺序） */
export function getCategoriesWithBuiltins(): FormulaCategoryId[] {
  const ids = new Set<FormulaCategoryId>()
  for (const b of FORMULA_BUILTIN_REGISTRY) ids.add(b.category)
  return FORMULA_CATEGORIES.map((c) => c.id).filter((id) => ids.has(id))
}

export function searchBuiltins(query: string): FormulaBuiltinEntry[] {
  const q = query.trim().toUpperCase()
  if (!q) return [...FORMULA_BUILTIN_REGISTRY]
  return FORMULA_BUILTIN_REGISTRY.filter((b) => {
    if (b.name.includes(q)) return true
    if (b.label.includes(query.trim())) return true
    if (b.hint.includes(query.trim())) return true
    return (b.aliases ?? []).some((a) => a.toUpperCase().includes(q))
  })
}

/** 从公式文本解析当前正在输入的函数名（=SUM( → SUM） */
export function parseActiveFunctionName(formula: string, caret: number): string | null {
  const head = formula.slice(0, caret)
  const m = head.match(/([A-Za-z][\w.]*)$/)
  if (!m) return null
  const name = m[1].toUpperCase().replace(/\./g, '')
  if (!name) return null
  const after = head.slice(head.length - m[1].length)
  if (!/^[A-Za-z]/.test(after)) return null
  return resolveBuiltinName(name) ?? null
}

export function buildFunctionNamePattern(): RegExp {
  const names = [...new Set(FORMULA_BUILTIN_REGISTRY.map((b) => b.name))]
  const escaped = names.sort((a, b) => b.length - a.length).map((n) =>
    n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  )
  return new RegExp(`\\b(${escaped.join('|')})\\s*\\(`, 'gi')
}

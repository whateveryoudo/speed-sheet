import type { FormulaCategoryId, FormulaCategoryMeta } from './types'

export const FORMULA_CATEGORIES: readonly FormulaCategoryMeta[] = [
  { id: 'math', label: '数学', labelEn: 'Math', formulajsCategory: 'Math and trigonometry' },
  { id: 'statistical', label: '统计', labelEn: 'Statistics', formulajsCategory: 'Statistical' },
  { id: 'financial', label: '财务', labelEn: 'Financial', formulajsCategory: 'Financial' },
  { id: 'engineering', label: '工程', labelEn: 'Engineering', formulajsCategory: 'Engineering' },
  { id: 'text', label: '文本', labelEn: 'Text', formulajsCategory: 'Text' },
  { id: 'logical', label: '逻辑', labelEn: 'Logical', formulajsCategory: 'Logical' },
  { id: 'date', label: '日期', labelEn: 'Date', formulajsCategory: 'Date and time' },
  { id: 'lookup', label: '查找', labelEn: 'Lookup', formulajsCategory: 'Lookup and reference' },
  { id: 'information', label: '信息', labelEn: 'Information', formulajsCategory: 'Information' },
  { id: 'database', label: '数据库', labelEn: 'Database', formulajsCategory: 'Database' },
  { id: 'compatibility', label: '兼容', labelEn: 'Compatibility', formulajsCategory: 'Compatibility' },
] as const

export function getCategoryMeta(id: FormulaCategoryId): FormulaCategoryMeta | undefined {
  return FORMULA_CATEGORIES.find((c) => c.id === id)
}

export function categoryLabel(id: FormulaCategoryId, locale: 'zh' | 'en' = 'zh'): string {
  const meta = getCategoryMeta(id)
  if (!meta) return id
  return locale === 'en' ? meta.labelEn : meta.label
}

/**
 * UI 元数据覆盖（可选）。
 * 函数全集来自 @formulajs/formulajs + formulajs-catalog.json（formulajs.info 分类）。
 * 此处只维护：常用 featured、已接入 implemented、中文 label/hint/syntax。
 * 其余函数使用默认占位，后续可对照语雀 / Excel 文档逐步补充。
 */
import type { FormulaBuiltinEntry, FormulaCategoryId } from './types'

type MetaOverride = Partial<FormulaBuiltinEntry> & { name: string }

export const FORMULA_META_OVERRIDES: readonly MetaOverride[] = [
  {
    name: 'SUM',
    category: 'statistical',
    label: '求和',
    syntax: 'SUM(数值1, [数值2], …)',
    hint: '返回一组数值和/或单元格的总和。',
    example: 'SUM(A1:A10)',
    implemented: true,
    featured: true,
  },
  {
    name: 'AVERAGE',
    category: 'statistical',
    label: '平均值',
    syntax: 'AVERAGE(数值1, [数值2], …)',
    hint: '返回其参数的算术平均值。',
    example: 'AVERAGE(A1:A10)',
    implemented: true,
    featured: true,
  },
  {
    name: 'COUNT',
    category: 'statistical',
    label: '计数',
    syntax: 'COUNT(数值1, [数值2], …)',
    hint: '计算参数列表中数字的个数。',
    example: 'COUNT(A1:A10)',
    implemented: true,
    featured: true,
  },
  {
    name: 'MAX',
    category: 'statistical',
    label: '最大值',
    syntax: 'MAX(数值1, [数值2], …)',
    hint: '返回参数列表中的最大值。',
    implemented: true,
    featured: true,
  },
  {
    name: 'MIN',
    category: 'statistical',
    label: '最小值',
    syntax: 'MIN(数值1, [数值2], …)',
    hint: '返回参数列表中的最小值。',
    implemented: true,
    featured: true,
  },
  {
    name: 'IF',
    category: 'logical',
    label: '条件',
    syntax: 'IF(条件, 真值, [假值])',
    hint: '判断是否满足某个条件，返回不同结果。',
    featured: true,
  },
  {
    name: 'AND',
    category: 'logical',
    label: '且',
    syntax: 'AND(逻辑1, [逻辑2], …)',
    hint: '所有参数为 TRUE 时返回 TRUE。',
    featured: true,
  },
  {
    name: 'OR',
    category: 'logical',
    label: '或',
    syntax: 'OR(逻辑1, [逻辑2], …)',
    hint: '任一参数为 TRUE 时返回 TRUE。',
    featured: true,
  },
  {
    name: 'ABS',
    category: 'math',
    label: '绝对值',
    syntax: 'ABS(数值)',
    hint: '返回数字的绝对值。',
  },
  {
    name: 'ROUND',
    category: 'math',
    label: '四舍五入',
    syntax: 'ROUND(数值, 位数)',
    hint: '按指定位数四舍五入。',
  },
  {
    name: 'VLOOKUP',
    category: 'lookup',
    label: '垂直查找',
    syntax: 'VLOOKUP(查找值, 表区域, 列序, [匹配])',
    hint: '在表首列查找并返回同行指定列。',
  },
] as const

export function getMetaOverrideMap(): Map<string, MetaOverride> {
  return new Map(FORMULA_META_OVERRIDES.map((m) => [m.name, m]))
}

export function defaultCategory(): FormulaCategoryId {
  return 'math'
}

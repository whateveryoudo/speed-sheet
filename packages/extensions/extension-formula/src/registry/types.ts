/**
 * 公式内置函数注册表类型。
 * 函数名以 @formulajs/formulajs 为准；分类对齐 formulajs.info / Excel。
 */

export type FormulaCategoryId =
  | 'math'
  | 'statistical'
  | 'financial'
  | 'engineering'
  | 'text'
  | 'logical'
  | 'date'
  | 'lookup'
  | 'information'
  | 'database'
  | 'compatibility'

export interface FormulaCategoryMeta {
  id: FormulaCategoryId
  /** 菜单/面板分类名（中文） */
  label: string
  labelEn: string
  /** formulajs.info 原始分类名 */
  formulajsCategory: string
}

export interface FormulaBuiltinEntry {
  /** 规范函数名（大写） */
  name: string
  aliases?: string[]
  category: FormulaCategoryId
  /** 短标签，如「求和」 */
  label: string
  labelEn?: string
  /** 语法摘要，如 SUM(数值1, [数值2], …) */
  syntax: string
  /** 一行说明（帮助气泡） */
  hint: string
  /** 详细定义（函数面板） */
  description?: string
  /** 示例 */
  example?: string
  /** 另请参阅 */
  seeAlso?: string[]
  /** speed-sheet 引擎已接入求值 */
  implemented?: boolean
  /** @formulajs/formulajs 包内存在实现 */
  formulajs?: boolean
  /** 常用函数区 */
  featured?: boolean
}

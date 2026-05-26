/** Excel 风格公式错误（显示值 + 提示文案） */

export type FormulaErrorCode =
  | 'ERROR'
  | 'VALUE'
  | 'NAME'
  | 'REF'
  | 'DIV0'
  | 'NA'
  | 'NUM'
  | 'NULL'

export interface FormulaErrorDef {
  code: FormulaErrorCode
  /** 单元格显示，如 #VALUE! */
  display: string
  /** 悬停提示（中文） */
  message: string
}

export const FORMULA_ERRORS: Record<FormulaErrorCode, FormulaErrorDef> = {
  ERROR: {
    code: 'ERROR',
    display: '#ERROR!',
    message: '公式解析错误',
  },
  VALUE: {
    code: 'VALUE',
    display: '#VALUE!',
    message: '值类型错误：运算或函数参数类型不匹配（例如数字与文本相加）',
  },
  NAME: {
    code: 'NAME',
    display: '#NAME?',
    message: '无法识别名称：函数名拼写错误、文本未加双引号，或工作表名引用不正确',
  },
  REF: {
    code: 'REF',
    display: '#REF!',
    message: '无效引用：引用的单元格、区域或工作表不存在',
  },
  DIV0: {
    code: 'DIV0',
    display: '#DIV/0!',
    message: '除数为零：公式中除以 0 或空单元格',
  },
  NA: {
    code: 'NA',
    display: '#N/A',
    message: '找不到匹配值：查找或匹配函数未找到对应数据',
  },
  NUM: {
    code: 'NUM',
    display: '#NUM!',
    message: '数值错误：结果超出可计算范围或数值不合法',
  },
  NULL: {
    code: 'NULL',
    display: '#NULL!',
    message: '空交集错误：区域引用之间使用了空格而非逗号或冒号',
  },
}

const ERROR_DISPLAY_SET = new Set(
  Object.values(FORMULA_ERRORS).map((e) => e.display),
)

export function formulaErrorResult(code: FormulaErrorCode): {
  value: null
  m: string
  error: FormulaErrorCode
  errorMessage: string
} {
  const def = FORMULA_ERRORS[code]
  return {
    value: null,
    m: def.display,
    error: def.code,
    errorMessage: def.message,
  }
}

export function isFormulaErrorDisplay(text: string): boolean {
  return ERROR_DISPLAY_SET.has(text.trim())
}

export function getFormulaErrorMessage(
  code: string | undefined,
  fallback?: string,
): string {
  if (code && code in FORMULA_ERRORS) {
    return FORMULA_ERRORS[code as FormulaErrorCode].message
  }
  return fallback ?? FORMULA_ERRORS.ERROR.message
}

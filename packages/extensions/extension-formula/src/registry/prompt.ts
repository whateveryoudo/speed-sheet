import type { FormulaBuiltinEntry } from './types'
import { getBuiltinEntry, searchBuiltins } from './index'

export interface FormulaSearchPrompt {
  type: 'search'
  query: string
  replaceRange: [number, number]
  candidates: FormulaBuiltinEntry[]
}

export interface FormulaHelpPrompt {
  type: 'help'
  functionName: string
  paramIndex: number
  entry: FormulaBuiltinEntry
  params: string[]
  activeParamIndex: number
}

export interface FormulaNonePrompt {
  type: 'none'
}

export type FormulaPromptContext = FormulaSearchPrompt | FormulaHelpPrompt | FormulaNonePrompt

/**
 * 将形如 "SUM(数值1, [数值2], …)" 解析出参数片段列表
 */
export function parseSyntaxParameters(syntax: string): string[] {
  if (!syntax) return []
  const firstParen = syntax.indexOf('(')
  const lastParen = syntax.lastIndexOf(')')
  if (firstParen < 0 || lastParen <= firstParen) return []
  const inner = syntax.slice(firstParen + 1, lastParen).trim()
  if (!inner) return []

  const parts: string[] = []
  let buf = ''
  let depth = 0
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch === '[' || ch === '(' || ch === '{') depth++
    else if (ch === ']' || ch === ')' || ch === '}') depth--

    if (ch === ',' && depth === 0) {
      parts.push(buf.trim())
      buf = ''
    } else {
      buf += ch
    }
  }
  if (buf.trim()) {
    parts.push(buf.trim())
  }
  return parts
}

export function rankCandidates(query: string, candidates: FormulaBuiltinEntry[]): FormulaBuiltinEntry[] {
  const q = query.trim().toUpperCase()
  if (!q) return candidates

  return [...candidates].sort((a, b) => {
    const aName = a.name.toUpperCase()
    const bName = b.name.toUpperCase()
    const aExact = aName === q
    const bExact = bName === q
    if (aExact !== bExact) return aExact ? -1 : 1

    const aPrefix = aName.startsWith(q)
    const bPrefix = bName.startsWith(q)
    if (aPrefix !== bPrefix) return aPrefix ? -1 : 1

    if (a.featured !== b.featured) return a.featured ? -1 : 1
    if (a.implemented !== b.implemented) return a.implemented ? -1 : 1

    return aName.localeCompare(bName)
  })
}

interface ParenFrame {
  fnName: string | null
  paramIndex: number
}

/**
 * 根据当前公式文本与光标字符偏移量，解析当前输入上下文（搜索补全 / 函数参数帮助）
 */
export function getFormulaPromptContext(formula: string, caret: number): FormulaPromptContext {
  if (!formula || caret < 0) return { type: 'none' }
  const text = formula.slice(0, caret)
  const trimmedLeft = text.trimStart()
  if (!trimmedLeft.startsWith('=')) return { type: 'none' }

  // 1. 词法扫描到 caret，维护括号栈与引号状态
  let inDoubleQuote = false
  let inSingleQuote = false
  const stack: ParenFrame[] = []

  let i = 0
  while (i < text.length) {
    const ch = text[i]

    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      i++
      continue
    }
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      i++
      continue
    }

    if (inDoubleQuote || inSingleQuote) {
      i++
      continue
    }

    if (ch === '(') {
      // 检查 ( 前面的标识符
      const before = text.slice(0, i).trimEnd()
      const m = before.match(/([A-Za-z][A-Za-z0-9_.]*)$/)
      const fnName = m ? m[1].toUpperCase().replace(/\./g, '') : null
      stack.push({ fnName, paramIndex: 0 })
      i++
      continue
    }

    if (ch === ')') {
      if (stack.length > 0) stack.pop()
      i++
      continue
    }

    if (ch === ',') {
      if (stack.length > 0) {
        stack[stack.length - 1].paramIndex++
      }
      i++
      continue
    }

    i++
  }

  // 如果在字符串内部，不显示弹窗
  if (inDoubleQuote || inSingleQuote) {
    return { type: 'none' }
  }

  // 2. 判断是否正在输入函数名进行搜索（末尾是正在打的标识符）
  // 必须紧跟在 = 或 ( 或 , 或 算术/逻辑运算符后面
  const tailMatch = text.match(/([A-Za-z][A-Za-z0-9_.]*)$/)
  if (tailMatch) {
    const query = tailMatch[1]
    const beforeToken = text.slice(0, text.length - query.length).trimEnd()
    const lastChar = beforeToken.slice(-1)
    const isStartOrOp =
      beforeToken === '' ||
      beforeToken === '=' ||
      /[=(),+\-*/^%&<>:]/.test(lastChar)

    if (isStartOrOp) {
      const allMatched = searchBuiltins(query)
      const ranked = rankCandidates(query, allMatched)
      const candidates = ranked.slice(0, 8)
      if (candidates.length > 0) {
        return {
          type: 'search',
          query,
          replaceRange: [caret - query.length, caret],
          candidates,
        }
      }
    }
  }

  // 3. 否则检查括号栈，若处于某个有效函数调用内，返回帮助上下文
  for (let s = stack.length - 1; s >= 0; s--) {
    const frame = stack[s]
    if (frame.fnName) {
      const entry = getBuiltinEntry(frame.fnName)
      if (entry) {
        const params = parseSyntaxParameters(entry.syntax)
        const activeParamIndex =
          params.length === 0
            ? 0
            : frame.paramIndex >= params.length
              ? params.length - 1
              : frame.paramIndex

        return {
          type: 'help',
          functionName: entry.name,
          paramIndex: frame.paramIndex,
          entry,
          params,
          activeParamIndex,
        }
      }
    }
  }

  return { type: 'none' }
}

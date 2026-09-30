import type { CellAttributes } from '@speed-sheet/shared'
import { formatCellValue, isDateFormatPattern } from '../format/number-format'

export interface CellRange {
  r0: number
  c0: number
  r1: number
  c1: number
}

export type AutofillDirection = 'down' | 'up' | 'right' | 'left'

export interface AutofillTarget {
  direction: AutofillDirection
  /** 新增填充的目标区域（不含原选区） */
  targetRange: CellRange
  /** 整体全选区（原选区 + 目标区域） */
  fullRange: CellRange
}

/** 列字母 → 0-based 列号 */
export function letterToCol(letters: string): number {
  let n = 0
  const s = letters.toUpperCase()
  for (let i = 0; i < s.length; i++) {
    n = n * 26 + (s.charCodeAt(i) - 64)
  }
  return n - 1
}

/** 0-based 列号 → 列字母 */
export function colToLetter(c: number): string {
  let s = ''
  let n = c
  do {
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return s
}

/**
 * 偏移公式中的相对引用（带 $ 的绝对引用保持不变）
 */
export function shiftFormulaReferences(formula: string, deltaR: number, deltaC: number): string {
  if (!formula.startsWith('=')) return formula

  // 匹配类似 A1, $A$1, A$1, $A1
  return formula.replace(/(\$?)([A-Za-z]+)(\$?)([0-9]+)/g, (_match, colLock, colLetters, rowLock, rowNum) => {
    let col = letterToCol(colLetters)
    let row = parseInt(rowNum, 10) - 1

    if (!colLock) {
      col = Math.max(0, col + deltaC)
    }
    if (!rowLock) {
      row = Math.max(0, row + deltaR)
    }

    return `${colLock}${colToLetter(col)}${rowLock}${row + 1}`
  })
}

/**
 * 根据源选区与鼠标当前悬停单元格坐标计算拖拽填充的目标范围与方向
 */
export function calcAutofillTarget(
  source: CellRange,
  hoverR: number,
  hoverC: number,
): AutofillTarget | null {
  const sr0 = Math.min(source.r0, source.r1)
  const sr1 = Math.max(source.r0, source.r1)
  const sc0 = Math.min(source.c0, source.c1)
  const sc1 = Math.max(source.c0, source.c1)

  // 如果在源选区内部，不触发填充
  if (hoverR >= sr0 && hoverR <= sr1 && hoverC >= sc0 && hoverC <= sc1) {
    return null
  }

  const dDown = hoverR > sr1 ? hoverR - sr1 : 0
  const dUp = hoverR < sr0 ? sr0 - hoverR : 0
  const dRight = hoverC > sc1 ? hoverC - sc1 : 0
  const dLeft = hoverC < sc0 ? sc0 - hoverC : 0

  const verticalDelta = Math.max(dDown, dUp)
  const horizontalDelta = Math.max(dRight, dLeft)

  // 主方向判断：哪边拖得更远就锁定该轴向
  if (verticalDelta >= horizontalDelta && verticalDelta > 0) {
    if (dDown >= dUp) {
      return {
        direction: 'down',
        targetRange: { r0: sr1 + 1, r1: hoverR, c0: sc0, c1: sc1 },
        fullRange: { r0: sr0, r1: hoverR, c0: sc0, c1: sc1 },
      }
    } else {
      return {
        direction: 'up',
        targetRange: { r0: hoverR, r1: sr0 - 1, c0: sc0, c1: sc1 },
        fullRange: { r0: hoverR, r1: sr1, c0: sc0, c1: sc1 },
      }
    }
  } else if (horizontalDelta > 0) {
    if (dRight >= dLeft) {
      return {
        direction: 'right',
        targetRange: { r0: sr0, r1: sr1, c0: sc1 + 1, c1: hoverC },
        fullRange: { r0: sr0, r1: sr1, c0: sc0, c1: hoverC },
      }
    } else {
      return {
        direction: 'left',
        targetRange: { r0: sr0, r1: sr1, c0: hoverC, c1: sc0 - 1 },
        fullRange: { r0: sr0, r1: sr1, c0: hoverC, c1: sc1 },
      }
    }
  }

  return null
}

const CYCLIC_LISTS: string[][] = [
  ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'],
  ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
]

/**
 * 沿单一序列轴（单行或单列）生成填充数据
 */
export function fill1DSequence(
  source: Array<CellAttributes | null>,
  targetLength: number,
  options: {
    direction: 'forward' | 'backward'
    axis: 'row' | 'col'
  },
): Array<CellAttributes> {
  const result: Array<CellAttributes> = []
  if (source.length === 0 || targetLength <= 0) return result

  const isFwd = options.direction === 'forward'

  // 0. 判断是否为周期性循环词汇（如 星期二 -> 星期三，一月 -> 二月，January -> February）
  if (source.length === 1 && source[0]?.v != null) {
    const rawStr = String(source[0].v).trim()
    const matchedCycle = CYCLIC_LISTS.find((list) =>
      list.some((item) => item.toLowerCase() === rawStr.toLowerCase()),
    )
    if (matchedCycle) {
      const cycleLen = matchedCycle.length
      const startIdx = matchedCycle.findIndex(
        (item) => item.toLowerCase() === rawStr.toLowerCase(),
      )
      for (let i = 0; i < targetLength; i++) {
        const stepIdx = i + 1
        const nextIdx = isFwd
          ? (startIdx + stepIdx) % cycleLen
          : (startIdx - (stepIdx % cycleLen) + cycleLen) % cycleLen
        const template = source[0] ?? { v: '' }
        const targetCell: CellAttributes = { ...template }
        targetCell.v = matchedCycle[nextIdx]
        targetCell.m = String(targetCell.v)
        result.push(targetCell)
      }
      return result
    }
  }

  // 1. 判断是否全为纯数字
  const numbers = source.map((s) => {
    if (s?.v == null || s.v === '') return null
    const n = Number(s.v)
    return !isNaN(n) && typeof s.v !== 'boolean' ? n : null
  })
  const allNumbers = numbers.every((n) => n != null)

  // 2. 判断是否为日期（带 ct 格式且 t='d' 或符合日期格式）
  const isDateSeq = source.every(
    (s) => s?.ct?.t === 'd' || (s?.ct?.fa && isDateFormatPattern(s.ct.fa)),
  )

  // 3. 判断是否为包含数字的文本（如 "第1周", "Item 1", "001"）
  const textNumberPattern = /^(.*?)(\d+)(\D*)$/
  const textNumbers = source.map((s) => {
    if (typeof s?.v === 'string') {
      const m = s.v.match(textNumberPattern)
      if (m) {
        return {
          prefix: m[1],
          num: parseInt(m[2], 10),
          pad: m[2].length,
          suffix: m[3] ?? '',
        }
      }
    }
    return null
  })
  const allTextNumbers = textNumbers.every((tn) => tn != null)

  // 4. 判断是否为标准日期格式文本字符串（如 "2025年10月1日", "2025-10-01"）
  if (source.length === 1 && typeof source[0]?.v === 'string') {
    const isoDateMatch = source[0].v
      .trim()
      .match(/^(\d{4})([-/.]|年)(\d{1,2})([-/.]|月)(\d{1,2})(日)?$/)
    if (isoDateMatch) {
      const y = parseInt(isoDateMatch[1], 10)
      const sep1 = isoDateMatch[2]
      const m = parseInt(isoDateMatch[3], 10)
      const sep2 = isoDateMatch[4]
      const d = parseInt(isoDateMatch[5], 10)
      const hasRi = !!isoDateMatch[6]
      const baseDate = new Date(Date.UTC(y, m - 1, d))
      if (!isNaN(baseDate.getTime())) {
        for (let i = 0; i < targetLength; i++) {
          const stepIdx = i + 1
          const nextDate = new Date(
            baseDate.getTime() + (isFwd ? stepIdx : -stepIdx) * 86400000,
          )
          const ny = nextDate.getUTCFullYear()
          const nm = String(nextDate.getUTCMonth() + 1).padStart(
            isoDateMatch[3].length,
            '0',
          )
          const nd = String(nextDate.getUTCDate()).padStart(
            isoDateMatch[5].length,
            '0',
          )
          const nextStr = `${ny}${sep1}${nm}${sep2}${nd}${hasRi ? '日' : ''}`
          const targetCell: CellAttributes = { ...(source[0] ?? { v: '' }) }
          targetCell.v = nextStr
          targetCell.m = nextStr
          result.push(targetCell)
        }
        return result
      }
    }
  }

  for (let i = 0; i < targetLength; i++) {
    // 步进索引（1-based）
    const stepIdx = i + 1
    // 循环取样模板样式
    const templateIdx = isFwd
      ? i % source.length
      : (source.length - 1 - (i % source.length) + source.length) % source.length
    const template = source[templateIdx] ?? { v: '' }
    const targetCell: CellAttributes = { ...template }

    // A. 处理公式
    if (template.f && typeof template.f === 'string') {
      const deltaR = options.axis === 'row' ? (isFwd ? stepIdx : -stepIdx) : 0
      const deltaC = options.axis === 'col' ? (isFwd ? stepIdx : -stepIdx) : 0
      targetCell.f = shiftFormulaReferences(template.f, deltaR, deltaC)
      targetCell.v = null
      targetCell.m = ''
      result.push(targetCell)
      continue
    }

    // B. 处理纯数字序列（单数字默认步长为 1 自增，多数字等差数列拟合）
    if (allNumbers && numbers.length > 0) {
      const first = numbers[0]!
      const last = numbers[numbers.length - 1]!
      const step =
        numbers.length > 1 ? (last - first) / (numbers.length - 1) : 1
      if (isFwd) {
        targetCell.v = last + step * stepIdx
      } else {
        targetCell.v = first - step * stepIdx
      }
      if (targetCell.ct) {
        targetCell.m = formatCellValue(targetCell.v, targetCell.ct).m
      } else {
        targetCell.m = String(targetCell.v)
      }
      result.push(targetCell)
      continue
    }

    // C. 处理日期序列
    if (isDateSeq && numbers.length > 0) {
      const step =
        numbers.length > 1
          ? (numbers[numbers.length - 1]! - numbers[0]!) / (numbers.length - 1)
          : 1 // 单日期默认步长为 1 天
      const baseNum = isFwd ? numbers[numbers.length - 1]! : numbers[0]!
      targetCell.v = isFwd ? baseNum + step * stepIdx : baseNum - step * stepIdx
      if (targetCell.ct) {
        targetCell.m = formatCellValue(targetCell.v, targetCell.ct).m
      } else {
        targetCell.m = String(targetCell.v)
      }
      result.push(targetCell)
      continue
    }

    // D. 处理数字结尾的文本（如 "第1周"）
    if (allTextNumbers && textNumbers.length > 0) {
      const first = textNumbers[0]!
      const last = textNumbers[textNumbers.length - 1]!
      const step =
        textNumbers.length > 1
          ? (last.num - first.num) / (textNumbers.length - 1)
          : 1
      const nextNum = isFwd
        ? Math.max(0, Math.round(last.num + step * stepIdx))
        : Math.max(0, Math.round(first.num - step * stepIdx))
      const padLen = last.pad
      const numStr = String(nextNum).padStart(padLen, '0')
      targetCell.v = `${last.prefix}${numStr}${last.suffix}`
      targetCell.m = String(targetCell.v)
      result.push(targetCell)
      continue
    }

    // E. 默认兜底：循环复制源值与样式
    result.push(targetCell)
  }

  return result
}

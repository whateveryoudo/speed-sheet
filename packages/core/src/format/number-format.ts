import type { CellFormat } from '@speed-sheet/shared'

const CHINESE_MONTHS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
]
const CHINESE_DAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Excel 序列号日期转换（基准日 1899-12-30 UTC）
 */
function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) {
    // 规范化为 UTC
    return new Date(Date.UTC(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      value.getHours(),
      value.getMinutes(),
      value.getSeconds(),
    ))
  }
  if (typeof value === 'number') {
    // 表格序列号天数（如 5 -> 1900-01-04，-5 -> 1899-12-25，45000 -> 2023-03-15）
    if (Math.abs(value) < 1000000) {
      const ms = Math.round((value - 25569) * 86400 * 1000)
      const d = new Date(ms)
      if (!isNaN(d.getTime())) return d
    } else if (value > 100000000000) {
      // 毫秒时间戳
      const d = new Date(value)
      if (!isNaN(d.getTime())) return d
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    // 匹配 YYYY-MM-DD 或 YYYY/MM/DD 或 YYYY.MM.DD [HH:mm:ss]
    const dateMatch = trimmed.match(
      /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/,
    )
    if (dateMatch) {
      const Y = parseInt(dateMatch[1], 10)
      const M = parseInt(dateMatch[2], 10) - 1
      const D = parseInt(dateMatch[3], 10)
      const H = dateMatch[4] ? parseInt(dateMatch[4], 10) : 0
      const m = dateMatch[5] ? parseInt(dateMatch[5], 10) : 0
      const s = dateMatch[6] ? parseInt(dateMatch[6], 10) : 0
      return new Date(Date.UTC(Y, M, D, H, m, s))
    }

    // 匹配纯时间 HH:mm[:ss] [AM|PM]
    const timeMatch = trimmed.match(
      /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?(?:\s*(AM|PM))?$/i,
    )
    if (timeMatch) {
      let H = parseInt(timeMatch[1], 10)
      const m = parseInt(timeMatch[2], 10)
      const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0
      const ap = timeMatch[4]?.toUpperCase()
      if (ap === 'PM' && H < 12) H += 12
      if (ap === 'AM' && H === 12) H = 0
      return new Date(Date.UTC(1900, 0, 1, H, m, s))
    }

    // 兜底尝试 Date 解析
    const normalized = trimmed.replace(/\./g, '-').replace(/\//g, '-')
    const d = new Date(normalized)
    if (!isNaN(d.getTime())) {
      return new Date(Date.UTC(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
        d.getMinutes(),
        d.getSeconds(),
      ))
    }
  }
  return null
}

function padZero(num: number, len = 2): string {
  return String(num).padStart(len, '0')
}

export function formatDateWithPattern(date: Date, pattern: string): string {
  const YYYY = date.getUTCFullYear()
  const M = date.getUTCMonth() + 1
  const MM = padZero(M)
  const D = date.getUTCDate()
  const DD = padZero(D)
  const dayOfWeek = date.getUTCDay()

  const H24 = date.getUTCHours()
  const HH = padZero(H24)
  const h12 = H24 % 12 === 0 ? 12 : H24 % 12
  const h = String(h12)
  const mm = padZero(date.getUTCMinutes())
  const ss = padZero(date.getUTCSeconds())
  const A = H24 < 12 ? 'AM' : 'PM'

  switch (pattern) {
    case 'YYYY-MM-DD':
      return `${YYYY}-${MM}-${DD}`
    case 'YYYY/MM/DD':
      return `${YYYY}/${MM}/${DD}`
    case 'MM/DD/YYYY':
      return `${MM}/${DD}/${YYYY}`
    case 'YYYY.MM.DD':
      return `${YYYY}.${MM}.${DD}`
    case 'YYYY-MM':
      return `${YYYY}-${MM}`
    case 'MM/DD':
      return `${MM}/${DD}`
    case 'YYYY':
      return `${YYYY}`
    case 'YYYY年M月D日':
      return `${YYYY}年${M}月${D}日`
    case 'YYYY年M月':
      return `${YYYY}年${M}月`
    case 'M月D日':
      return `${M}月${D}日`
    case '一月':
      return CHINESE_MONTHS[M - 1] ?? `${M}月`
    case '星期一':
      return CHINESE_DAYS[dayOfWeek] ?? ''
    case 'January 8, 2018':
    case 'MMMM D, YYYY':
      return `${ENGLISH_MONTHS[M - 1]} ${D}, ${YYYY}`
    case 'January':
    case 'MMMM':
      return ENGLISH_MONTHS[M - 1] ?? ''
    case 'Monday':
    case 'dddd':
      return ENGLISH_DAYS[dayOfWeek] ?? ''
    // 时间
    case 'HH:mm:ss':
      return `${HH}:${mm}:${ss}`
    case '1:00:00 PM':
    case 'h:mm:ss A':
      return `${h}:${mm}:${ss} ${A}`
    case 'HH:mm':
      return `${HH}:${mm}`
    case '1:00 PM':
    case 'h:mm A':
      return `${h}:${mm} ${A}`
    // 日期时间
    case 'YYYY-MM-DD HH:mm:ss':
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`
    case 'YYYY/MM/DD HH:mm:ss':
      return `${YYYY}/${MM}/${DD} ${HH}:${mm}:${ss}`
    case 'YYYY/MM/DD 1:00 PM':
    case 'YYYY/MM/DD h:mm A':
      return `${YYYY}/${MM}/${DD} ${h}:${mm} ${A}`
    default:
      // 通用替换
      return pattern
        .replace(/YYYY/g, String(YYYY))
        .replace(/MM/g, MM)
        .replace(/DD/g, DD)
        .replace(/HH/g, HH)
        .replace(/mm/g, mm)
        .replace(/ss/g, ss)
        .replace(/h/g, h)
        .replace(/A/g, A)
  }
}

/**
 * 格式化数字：支持千分位、固定小数位数、前缀/后缀（如货币符号、百分比）
 */
function formatNumber(
  num: number,
  options: {
    decimals?: number
    useThousands?: boolean
    prefix?: string
    suffix?: string
  },
): string {
  const { decimals, useThousands = true, prefix = '', suffix = '' } = options

  const isNeg = num < 0
  const absNum = Math.abs(num)

  let formattedNum: string
  if (decimals !== undefined && decimals >= 0) {
    formattedNum = absNum.toFixed(decimals)
  } else {
    // 保留原始有效位数，避免浮点数精度过长
    formattedNum = String(Number(absNum.toPrecision(12)))
  }

  const parts = formattedNum.split('.')
  if (useThousands) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  const result = (isNeg ? '-' : '') + prefix + parts.join('.') + suffix
  return result
}

/**
 * 解析格式串中的小数位数
 */
export function getFormatDecimalPlaces(fa: string): number {
  if (!fa || fa === 'General' || fa === '@') return 0
  const dotIdx = fa.indexOf('.')
  if (dotIdx === -1) return 0
  let count = 0
  for (let i = dotIdx + 1; i < fa.length; i++) {
    const char = fa[i]
    if (char === '0' || char === '#') {
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * 动态调整小数位数（增加/减少）
 */
export function adjustFormatDecimalPlaces(
  currentFormat: CellFormat | undefined,
  currentValue: unknown,
  delta: 1 | -1,
): CellFormat {
  let fa = currentFormat?.fa ?? 'General'
  const isPercent = fa.includes('%')
  const isCurrency = fa.includes('¥') || fa.includes('$') || fa.includes('€') || fa.includes('£')
  const currencySymbol = isCurrency
    ? (fa.match(/[¥$€£]/)?.[0] ?? '¥')
    : ''

  let currentDecimals = 0
  if (fa === 'General' || !currentFormat) {
    // 从当前值猜测初始小数位数
    const num = Number(currentValue)
    if (!isNaN(num) && typeof currentValue !== 'boolean') {
      const parts = String(currentValue).split('.')
      currentDecimals = parts[1] ? parts[1].length : 0
    }
  } else {
    currentDecimals = getFormatDecimalPlaces(fa)
  }

  const nextDecimals = Math.max(0, Math.min(10, currentDecimals + delta))
  const zeros = nextDecimals > 0 ? '.' + '0'.repeat(nextDecimals) : ''

  let nextFa = ''
  if (isPercent) {
    nextFa = `0${zeros}%`
  } else if (isCurrency) {
    nextFa = `${currencySymbol}#,##0${zeros}`
  } else {
    nextFa = `#,##0${zeros}`
  }

  return {
    fa: nextFa,
    t: 'n',
  }
}

/**
 * 核心格式化函数：将单元格原始值 v 根据格式配置 ct 转换为展示值 m
 */
export function formatCellValue(value: unknown, format: CellFormat | undefined): { m: string; v?: any } {
  if (value == null) {
    return { m: '' }
  }

  if (!format || format.fa === 'General' || format.t === 'g') {
    return { m: String(value) }
  }

  const fa = format.fa

  // 1. 纯文本模式
  if (fa === '@' || format.t === 's') {
    return { m: String(value) }
  }

  // 2. 日期 / 时间模式
  if (format.t === 'd' || isDateFormatPattern(fa)) {
    const date = parseDateValue(value)
    if (date) {
      return { m: formatDateWithPattern(date, fa) }
    }
    return { m: String(value) }
  }

  // 3. 数字 / 货币 / 百分比模式
  const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''))
  if (isNaN(num)) {
    return { m: String(value) }
  }

  // 百分比
  if (fa.includes('%')) {
    const decimals = getFormatDecimalPlaces(fa)
    return {
      m: formatNumber(num * 100, {
        decimals,
        useThousands: false,
        suffix: '%',
      }),
    }
  }

  // 货币
  if (/[¥$€£]/.test(fa)) {
    const symbol = fa.match(/[¥$€£]/)?.[0] ?? '¥'
    const decimals = getFormatDecimalPlaces(fa)
    const useThousands = fa.includes(',')
    return {
      m: formatNumber(num, {
        decimals,
        useThousands,
        prefix: symbol,
      }),
    }
  }

  // 普通数值（带千分位或固定小数）
  if (fa.includes('0') || fa.includes('#')) {
    const decimals = getFormatDecimalPlaces(fa)
    const useThousands = fa.includes(',')
    return {
      m: formatNumber(num, {
        decimals,
        useThousands,
      }),
    }
  }

  return { m: String(value) }
}

export function isDateFormatPattern(fa: string): boolean {
  return (
    fa.includes('YYYY') ||
    fa.includes('MM') ||
    fa.includes('DD') ||
    fa.includes('HH') ||
    fa.includes('mm') ||
    fa.includes('ss') ||
    fa.includes('年') ||
    fa.includes('月') ||
    fa.includes('日') ||
    fa.includes('星期') ||
    fa === '一月' ||
    fa === 'January' ||
    fa === 'Monday'
  )
}

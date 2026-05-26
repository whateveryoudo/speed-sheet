import * as formulajs from '@formulajs/formulajs'
import { buildFunctionNamePattern, getImplementedBuiltinNames } from './registry'

export type FormulaFn = (values: number[]) => number

function buildFnMap(): Record<string, FormulaFn> {
  const map: Record<string, FormulaFn> = {}
  const lib = formulajs as Record<string, unknown>
  for (const name of getImplementedBuiltinNames()) {
    const fn = lib[name]
    if (typeof fn !== 'function') continue
    map[name] = fn as FormulaFn
  }
  return map
}

export const FN_MAP = buildFnMap()
export const FN_RE = buildFunctionNamePattern()

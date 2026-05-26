import { getFormulaErrorMessage } from './errors'
import type { FormulaResult } from './evaluate'
import type { CellAttributes } from '@speed-sheet/shared'

export function cellPatchFromFormulaResult(
  formula: string,
  result: FormulaResult,
): Partial<CellAttributes> {
  const f = formula.trim()
  if (result.error) {
    return {
      f,
      v: null,
      m: result.m,
      ef: result.error,
      em: result.errorMessage ?? getFormulaErrorMessage(result.error),
    }
  }
  return {
    f,
    v: result.value,
    m: result.m,
    ef: undefined,
    em: undefined,
  }
}

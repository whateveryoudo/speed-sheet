export { FormulaExtension, getFormulaHighlights } from './extension'
export { evaluateFormulaString } from './evaluate'
export {
  isFormulaInput,
  isFormulaText,
  getCellFormulaInitial,
  getCellFormulaInitialFromCell,
  formatRangeA1,
  buildSheetRefToken,
  patchFormulaWithRef,
  canPickFormulaRef,
  canPickFormulaRefAtCaret,
} from './edit'
export { createFormulaContext } from './context'
export type { FormulaStorage } from './extension'
export type { FormulaRangeHighlight } from './engine'
export { formatA1, colToLetter, letterToCol, parseRefToken, extractRefTokens } from './refs'
export {
  displayFormulaToInternal,
  internalFormulaToDisplay,
  hasInternalRefs,
} from './formula-bindings'
export { getFormulaRefSpans, FORMULA_REF_COLORS } from './refSpans'
export type { FormulaRefSpan } from './refSpans'
export {
  FORMULA_BUILTIN_REGISTRY,
  FORMULA_CATEGORIES,
  getBuiltinEntry,
  getFeaturedBuiltins,
  getBuiltinsByCategory,
  getCategoriesWithBuiltins,
  searchBuiltins,
  parseActiveFunctionName,
  resolveBuiltinName,
  isRegisteredBuiltin,
  categoryLabel,
} from './registry'
export type { FormulaBuiltinEntry, FormulaCategoryId } from './registry'
export type { FormulaResult, FormulaErrorCode } from './evaluate'
export {
  FORMULA_ERRORS,
  isFormulaErrorDisplay,
  getFormulaErrorMessage,
  formulaErrorResult,
} from './errors'
export { cellPatchFromFormulaResult } from './result'

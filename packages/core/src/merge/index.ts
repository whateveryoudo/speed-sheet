import type { MergeRange } from '@speed-sheet/shared'
import { MergeContext } from './MergeContext'

export { MergeContext } from './MergeContext'
export type { MergeDisplayBounds, MergeHitRange } from './MergeContext'

/** @deprecated 使用 `createMergeContext().anchor(r, c)` 或 `MergeContext.fromRanges(merges).anchor(r, c)` */
export function resolveMergeAnchor(
  r: number,
  c: number,
  merges?: MergeRange[],
): { r: number; c: number } {
  return MergeContext.fromRanges(merges ?? []).anchor(r, c)
}
export {
  buildMergeLookup,
  mergePixelRect,
  focusPixelRect,
  selectionDisplayBounds,
  selectionRangeForMergeHit,
  findMergeMatchingSelection,
  isMergeInternalColLineAtRow,
  isMergeInternalRowLineAtCol,
} from './layout'
export type { MergeLookup } from './layout'

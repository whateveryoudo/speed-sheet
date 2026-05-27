import { nanoid } from 'nanoid'

/**
 * Opaque row/column ids (persisted). Prefix = axis only, not display index.
 * Example: r_V1StGXR8_Z5j, c_9bQdYxLm3Kp2
 */
export const ROW_ID_PREFIX = 'r_'
export const COL_ID_PREFIX = 'c_'

/** NanoID length (12 ≈ 4.7×10^21 combinations; fine for row/col slots). */
export const AXIS_NANOID_SIZE = 12

/** For formula internal refs; id body must not contain : # ~ @ | */
export const AXIS_ID_PATTERN = '[rc]_[^:#~@|]+'

export function allocRowId(): string {
  return `${ROW_ID_PREFIX}${nanoid(AXIS_NANOID_SIZE)}`
}

export function allocColId(): string {
  return `${COL_ID_PREFIX}${nanoid(AXIS_NANOID_SIZE)}`
}

export function isRowId(id: string): boolean {
  return id.startsWith(ROW_ID_PREFIX) && id.length > ROW_ID_PREFIX.length
}

export function isColId(id: string): boolean {
  return id.startsWith(COL_ID_PREFIX) && id.length > COL_ID_PREFIX.length
}

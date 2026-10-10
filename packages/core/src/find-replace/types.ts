export interface FindOptions {
  caseSensitive?: boolean
  matchEntireCell?: boolean
}

export interface FindMatch {
  r: number
  c: number
  value: string
}

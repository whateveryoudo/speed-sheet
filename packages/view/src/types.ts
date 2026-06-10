/** Framework-neutral inline style map (pixel values as `"12px"` strings). */
export type CssStyle = Record<string, string>

export type SheetScrollbarUi = {
  canScrollX: boolean
  canScrollY: boolean
  gutterXStyle: CssStyle
  gutterYStyle: CssStyle
  trackXStyle: CssStyle
  trackYStyle: CssStyle
  thumbXStyle: CssStyle
  thumbYStyle: CssStyle
}

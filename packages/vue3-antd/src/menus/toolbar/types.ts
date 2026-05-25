export type ToolbarItemConfig =
  | string
  | {
      key: string
      [key: string]: unknown
    }

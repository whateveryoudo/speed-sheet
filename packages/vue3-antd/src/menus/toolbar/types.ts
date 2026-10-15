import type { Component } from 'vue'

export type ToolbarItemConfig =
  | string
  | {
      key: string
      component?: Component
      [key: string]: unknown
    }

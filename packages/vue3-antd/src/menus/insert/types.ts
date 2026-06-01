import type { Component, VNode } from 'vue'
import type { Sheet } from '@speed-sheet/core'
import type { DataVerificationRule } from '@speed-sheet/shared'

export interface InsertMenuActionContext {
  sheet: Sheet | null
  anchor: { r: number; c: number }
  selection: import('@speed-sheet/shared').Selection | null
}

export type InsertMenuAction = (ctx: InsertMenuActionContext) => void | Promise<void>

/** 叶子菜单项（对齐 tiptap SubMenuGroup） */
export interface InsertMenuItemDef {
  key: string
  label: string
  icon?: Component
  disabled?: boolean
  /** 右侧子菜单（公式等） */
  submenu?: InsertMenuItemDef[]
  shortcut?: string
  action?: InsertMenuAction
}

export interface InsertMenuGroupDef {
  key: string
  children: InsertMenuItemDef[]
}

export type InsertMenuItemConfig = string | { key: string; [key: string]: unknown }

export interface InsertMenuConfig {
  /** 仅保留这些 key（叶子 key 或 '|'） */
  includeKeys?: string[]
  excludeKeys?: string[]
  /** 追加/覆盖叶子项 */
  items?: (Partial<InsertMenuItemDef> & { key: string; action?: InsertMenuAction })[]
  /** 自定义分组（合并到默认分组） */
  groups?: InsertMenuGroupDef[]
}

export type DropdownPanelPayload = {
  r: number
  c: number
  rule?: DataVerificationRule | null
  onDone: () => void
}

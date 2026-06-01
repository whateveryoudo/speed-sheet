import { computed, type Ref } from 'vue'
import { builtinInsertMenuItems } from './builtins'
import { defaultInsertMenuKeys } from './keys'
import type {
  InsertMenuConfig,
  InsertMenuGroupDef,
  InsertMenuItemConfig,
  InsertMenuItemDef,
} from './types'

function resolveKeys(
  keys: InsertMenuItemConfig[] | undefined,
  config?: InsertMenuConfig,
): string[] {
  let list = (keys ?? defaultInsertMenuKeys).map((k) =>
    typeof k === 'string' ? k : k.key,
  )
  if (config?.includeKeys?.length) {
    const allow = new Set(config.includeKeys)
    list = list.filter((k) => k === '|' || allow.has(k))
  }
  if (config?.excludeKeys?.length) {
    const deny = new Set(config.excludeKeys)
    list = list.filter((k) => k === '|' || !deny.has(k))
  }
  return list
}

function mergeItem(
  base: Omit<InsertMenuItemDef, 'action'>,
  patch: Partial<InsertMenuItemDef> | undefined,
  action: InsertMenuItemDef['action'],
): InsertMenuItemDef {
  return {
    ...base,
    ...patch,
    key: base.key,
    action,
  }
}

export function useInsertMenu(options: {
  insertMenuKeys?: Ref<InsertMenuItemConfig[] | undefined>
  insertMenuConfig?: Ref<InsertMenuConfig | undefined>
  registerAction: (key: string, action: InsertMenuItemDef['action']) => InsertMenuItemDef['action']
}) {
  const flatItems = computed(() => {
    const cfg = options.insertMenuConfig?.value
    const keys = resolveKeys(options.insertMenuKeys?.value, cfg)
    const patchMap = new Map((cfg?.items ?? []).map((i) => [i.key, i]))
    const out: InsertMenuItemDef[] = []
    for (const key of keys) {
      if (key === '|') continue
      const base = builtinInsertMenuItems[key]
      if (!base) {
        const custom = patchMap.get(key)
        if (custom) {
          out.push(
            mergeItem(
              { key, label: key },
              custom,
              options.registerAction(key, custom.action),
            ),
          )
        }
        continue
      }
      const patch = patchMap.get(key)
      out.push(mergeItem(base, patch, options.registerAction(key, patch?.action)))
    }
    return out
  })

  const menuGroups = computed((): InsertMenuGroupDef[] => {
    const cfg = options.insertMenuConfig?.value
    const keys = resolveKeys(options.insertMenuKeys?.value, cfg)
    const itemMap = new Map(flatItems.value.map((i) => [i.key, i]))
    const groups: InsertMenuGroupDef[] = []
    let current: InsertMenuItemDef[] = []

    const flush = () => {
      if (!current.length) return
      groups.push({
        key: `group-${groups.length}`,
        children: current,
      })
      current = []
    }

    for (const key of keys) {
      if (key === '|') {
        flush()
        continue
      }
      const item = itemMap.get(key)
      if (item) current.push(item)
    }
    flush()

    if (cfg?.groups?.length) {
      return [...groups, ...cfg.groups]
    }
    return groups
  })

  return { menuGroups, flatItems }
}

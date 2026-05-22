import { Extension, type CommandContext } from '@speed-sheet/core'

export interface FilterCriteria {
  column: number
  type: 'value' | 'condition' | 'top10'
  values?: string[]
  condition?: string
}

export const FilterExtension = Extension.create<{
  filters: Map<string, FilterCriteria[]>
}>({
  name: 'filter',

  addStorage() {
    return {
      filters: new Map(),
    }
  },

  addCommands(ctx) {
    return {
      applyFilter: (criteria: FilterCriteria) => {
        return ({ state, ydoc }: CommandContext) => {
          const sheetId = state.root.get('id') as string ?? '0'
          const key = `filter_${sheetId}`

          if (!this.storage.filters.has(key)) {
            this.storage.filters.set(key, [])
          }
          const filters = this.storage.filters.get(key)!

          // Replace existing filter for same column
          const idx = filters.findIndex((f: FilterCriteria) => f.column === criteria.column)
          if (idx >= 0) filters[idx] = criteria
          else filters.push(criteria)

          // Store in Y.Map for persistence/sync
          const yFilters = state.root.get('_filters') as any
          if (yFilters) {
            ydoc.transact(() => {
              yFilters.set(`col_${criteria.column}`, criteria)
            })
          }

          return true
        }
      },

      clearFilter: (column?: number) => {
        return ({ state }: CommandContext) => {
          const sheetId = state.root.get('id') as string ?? '0'
          const key = `filter_${sheetId}`

          if (column !== undefined) {
            const filters = this.storage.filters.get(key)
            if (filters) {
              const idx = filters.findIndex((f: FilterCriteria) => f.column === column)
              if (idx >= 0) filters.splice(idx, 1)
            }
          } else {
            this.storage.filters.set(key, [])
          }

          return true
        }
      },

      getFilters: () => {
        return ({ state }: CommandContext) => {
          const sheetId = state.root.get('id') as string ?? '0'
          const key = `filter_${sheetId}`
          // Query commands still use CommandFn shape (return boolean)
          void (this.storage.filters.get(key) ?? [])
          return true
        }
      },
    }
  },

  onCellChange(r, c, newValue, oldValue) {
    // When cell data changes, re-apply active filters
    // In a full implementation, this would re-evaluate which rows are visible
  },
})

import { Extension } from '@speed-sheet/core'
import type { CommandContext } from '@speed-sheet/core'
import * as Y from 'yjs'

// Extension for importing/exporting Excel files via SheetJS (xlsx)
// Install: pnpm add xlsx

export const ImportExportExtension = Extension.create({
  name: 'importExport',

  addCommands(ctx) {
    return {
      importXlsx: (file: File) => {
        return async ({ ydoc }: CommandContext) => {
          try {
            // Dynamic import: xlsx is a peer dependency
            const XLSX = await import('xlsx')

            const buffer = await file.arrayBuffer()
            const wb = XLSX.read(buffer, { type: 'array' })

            const sheetsMap = ydoc.getMap('sheets')

            for (const sheetName of wb.SheetNames) {
              const ws = wb.Sheets[sheetName]
              const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { header: 1 })

              const ySheet = new Y.Map()
              ySheet.set('name', sheetName)

              const yCells = new Y.Map<Y.Map<any>>()
              for (let r = 0; r < json.length; r++) {
                const row = json[r]
                if (!row) continue
                for (let c = 0; c < row.length; c++) {
                  const val = row[c]
                  if (val == null || val === '') continue
                  const cellMap = new Y.Map()
                  cellMap.set('v', val)
                  cellMap.set('m', String(val))
                  yCells.set(`R${r}_C${c}`, cellMap)
                }
              }
              ySheet.set('cells', yCells)

              // Generate unique ID
              const id = `import_${sheetName}_${Date.now()}`
              sheetsMap.set(id, ySheet)
            }

            return true
          } catch (e) {
            console.error('[@speed-sheet/extension-import-export] Failed to import xlsx:', e)
            return false
          }
        }
      },

      exportXlsx: () => {
        return async ({ ydoc }: CommandContext) => {
          try {
            const XLSX = await import('xlsx')

            const ySheets = ydoc.getMap('sheets')
            const wb = XLSX.utils.book_new()

            ySheets.forEach((ySheet: any, _id: string) => {
              const name: string = ySheet.get('name') ?? 'Sheet'
              const yCells = ySheet.get('cells')
              const cells: Record<string, any> = {}
              yCells.forEach((cellMap: any, key: string) => {
                cells[key] = cellMap.get('v') ?? cellMap.get('m') ?? ''
              })

              // Build 2D array for sheetjs
              let maxR = 0; let maxC = 0
              const entries: { r: number; c: number; v: any }[] = []
              yCells.forEach((cm: any, key: string) => {
                const [, rs, cs] = key.match(/R(\d+)_C(\d+)/) ?? []
                if (!rs || !cs) return
                const r = parseInt(rs), c = parseInt(cs)
                maxR = Math.max(maxR, r); maxC = Math.max(maxC, c)
                entries.push({ r, c, v: cm.get('v') ?? cm.get('m') ?? '' })
              })

              const grid = Array.from({ length: maxR + 1 }, () => Array(maxC + 1).fill(null))
              for (const { r, c, v } of entries) grid[r][c] = v

              const ws = XLSX.utils.aoa_to_sheet(grid)
              XLSX.utils.book_append_sheet(wb, ws, name)
            })

            XLSX.writeFile(wb, 'export.xlsx')
            return true
          } catch (e) {
            console.error('[@speed-sheet/extension-import-export] Failed to export xlsx:', e)
            return false
          }
        }
      },
    }
  },
})

import { Extension } from '@speed-sheet/core'
import { exportSnapshotToXlsx } from './xlsx/export'
import { importXlsxToSnapshot } from './xlsx/import'
import { exportSnapshotToSpeedSheet, importSpeedSheetToSnapshot } from './speedsheet'
import { exportSnapshotToCsv } from './csv/export'
import { importCsvToSnapshot } from './csv/import'
import { downloadBlob, promptSelectFile } from './browser/download'

export const IMPORT_EXPORT_EXTENSION_NAME = 'importExport'

export const ImportExportExtension = Extension.create({
  name: IMPORT_EXPORT_EXTENSION_NAME,

  addCommands({ sheet }) {
    return {
      /**
       * 导出当前工作簿为 Excel (.xlsx) 文件并触发下载
       */
      exportXlsx: (filename?: string) => {
        return async () => {
          try {
            const snapshot = sheet.toSnapshot()
            const activeSheetName = sheet.getSheetName(sheet.getActiveSheetId()) || 'Sheet'
            const defaultName = `${activeSheetName}_${Date.now()}.xlsx`
            const finalName = filename || defaultName

            const buffer = await exportSnapshotToXlsx(snapshot)
            downloadBlob(
              buffer,
              finalName.endsWith('.xlsx') ? finalName : `${finalName}.xlsx`,
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            )
            return true
          } catch (e) {
            console.error('[@speed-sheet/extension-import-export] Export XLSX failed:', e)
            return false
          }
        }
      },

      /**
       * 导入 Excel (.xlsx) 文件，解析并载入当前工作簿
       */
      importXlsx: (fileOrData?: File | ArrayBuffer | Uint8Array) => {
        return async () => {
          try {
            let buffer: ArrayBuffer | Uint8Array | null = null

            if (!fileOrData) {
              const file = await promptSelectFile('.xlsx')
              if (!file) return false
              buffer = await file.arrayBuffer()
            } else if (fileOrData instanceof File) {
              buffer = await fileOrData.arrayBuffer()
            } else {
              buffer = fileOrData
            }

            if (!buffer) return false
            const snapshot = await importXlsxToSnapshot(buffer)
            sheet.loadSnapshot(snapshot, { replace: true })
            return true
          } catch (e) {
            console.error('[@speed-sheet/extension-import-export] Import XLSX failed:', e)
            return false
          }
        }
      },

      /**
       * 导出当前工作簿为本站专属 .speedsheet 无损格式并触发下载
       */
      exportSpeedSheet: (filename?: string) => {
        return async () => {
          try {
            const snapshot = sheet.toSnapshot()
            const activeSheetName = sheet.getSheetName(sheet.getActiveSheetId()) || 'Sheet'
            const defaultName = `${activeSheetName}_${Date.now()}.speedsheet`
            const finalName = filename || defaultName

            const content = exportSnapshotToSpeedSheet(snapshot, { pretty: true })
            downloadBlob(
              content,
              finalName.endsWith('.speedsheet') ? finalName : `${finalName}.speedsheet`,
              'application/json',
            )
            return true
          } catch (e) {
            console.error('[@speed-sheet/extension-import-export] Export SpeedSheet failed:', e)
            return false
          }
        }
      },

      /**
       * 导入 .speedsheet 文件并无损还原
       */
      importSpeedSheet: (fileOrContent?: File | string | Record<string, any>) => {
        return async () => {
          try {
            let rawContent: string | Record<string, any> | null = null

            if (!fileOrContent) {
              const file = await promptSelectFile('.speedsheet,.json')
              if (!file) return false
              rawContent = await file.text()
            } else if (fileOrContent instanceof File) {
              rawContent = await fileOrContent.text()
            } else {
              rawContent = fileOrContent
            }

            if (!rawContent) return false
            const snapshot = importSpeedSheetToSnapshot(rawContent)
            sheet.loadSnapshot(snapshot, { replace: true })
            return true
          } catch (e) {
            console.error('[@speed-sheet/extension-import-export] Import SpeedSheet failed:', e)
            return false
          }
        }
      },

      /**
       * 导出当前活动表为 CSV 文件
       */
      exportCsv: (filename?: string) => {
        return async () => {
          try {
            const snapshot = sheet.toSnapshot()
            const activeId = sheet.getActiveSheetId()
            const activeSheetName = sheet.getSheetName(activeId) || 'Sheet'
            const defaultName = `${activeSheetName}_${Date.now()}.csv`
            const finalName = filename || defaultName

            const csvStr = exportSnapshotToCsv(snapshot, { sheetIdOrIndex: activeId })
            downloadBlob(
              csvStr,
              finalName.endsWith('.csv') ? finalName : `${finalName}.csv`,
              'text/csv;charset=utf-8',
            )
            return true
          } catch (e) {
            console.error('[@speed-sheet/extension-import-export] Export CSV failed:', e)
            return false
          }
        }
      },

      /**
       * 导入 CSV 文件并解析载入当前工作簿
       */
      importCsv: (fileOrText?: File | string) => {
        return async () => {
          try {
            let csvText: string | null = null

            if (!fileOrText) {
              const file = await promptSelectFile('.csv,text/csv')
              if (!file) return false
              csvText = await file.text()
            } else if (fileOrText instanceof File) {
              csvText = await fileOrText.text()
            } else {
              csvText = fileOrText
            }

            if (!csvText) return false
            const snapshot = importCsvToSnapshot(csvText)
            sheet.loadSnapshot(snapshot, { replace: true })
            return true
          } catch (e) {
            console.error('[@speed-sheet/extension-import-export] Import CSV failed:', e)
            return false
          }
        }
      },
    }
  },
})

import { Extension } from '../Extension'
import type { CommandContext } from '../types'
import type { CellAttachmentMeta, DataVerificationRule, DropdownListOption } from '@speed-sheet/shared'
import { clearCellRichContent } from '../../state/cell-rich-content'

function dropdownDisplayValue(value: string | string[] | undefined): string {
  if (value == null) return ''
  return Array.isArray(value) ? value.join(', ') : String(value)
}
export const CellInsertExtension = Extension.create({
  name: 'cellInsert',
  priority: -45,

  addCommands() {
    return {
      insertCheckbox: (props: { r: number; c: number; checked?: boolean; label?: string }) => {
        return ({ state }: CommandContext) => {
          clearCellRichContent(state, props.r, props.c)
          state.setDataVerification(props.r, props.c, {
            type: 'checkbox',
            checked: props.checked ?? false,
            label: props.label,
          })
          if (props.label != null) {
            state.setCell(props.r, props.c, { m: props.label, v: props.label })
          } else {
            const cell = state.getCellData(props.r, props.c)
            if (!cell?.m && !cell?.v) {
              state.setCell(props.r, props.c, { m: '', v: '' })
            }
          }
          return true
        }
      },

      toggleCheckbox: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          const rule = state.getDataVerification(props.r, props.c)
          if (rule?.type !== 'checkbox') return false
          state.setDataVerification(props.r, props.c, {
            ...rule,
            checked: !rule.checked,
          })
          return true
        }
      },

      removeCheckbox: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          state.setDataVerification(props.r, props.c, null)
          return true
        }
      },

      insertDropdown: (props: {
        r: number
        c: number
        options: DropdownListOption[]
        multiSelect?: boolean
        useColor?: boolean
        value?: string | string[]
      }) => {
        return ({ state }: CommandContext) => {
          clearCellRichContent(state, props.r, props.c)
          const options = props.options.length
            ? props.options
            : [{ value: '1' }, { value: '2' }, { value: '3' }]
          const rule: DataVerificationRule = {
            type: 'dropdown',
            options,
            multiSelect: props.multiSelect ?? false,
            useColor: props.useColor ?? false,
            value: props.multiSelect ? (props.value ?? []) : props.value,
          }
          state.setDataVerification(props.r, props.c, rule)
          const display = dropdownDisplayValue(
            props.multiSelect ? (props.value ?? []) : (props.value ?? ''),
          )
          if (display) {
            state.setCell(props.r, props.c, { v: display, m: display })
          }
          return true
        }
      },

      setDropdownValue: (props: { r: number; c: number; value: string | string[] }) => {
        return ({ state }: CommandContext) => {
          const rule = state.getDataVerification(props.r, props.c)
          if (rule?.type !== 'dropdown') return false
          state.setDataVerification(props.r, props.c, { ...rule, value: props.value })
          const display = dropdownDisplayValue(props.value)
          state.setCell(props.r, props.c, { v: display, m: display })
          return true
        }
      },

      removeDropdown: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          const rule = state.getDataVerification(props.r, props.c)
          if (rule?.type !== 'dropdown') return false
          state.setDataVerification(props.r, props.c, null)
          state.deleteCell(props.r, props.c)
          return true
        }
      },

      insertCellAttachment: (props: {
        r: number
        c: number
        attachment: CellAttachmentMeta
      }) => {
        return ({ state }: CommandContext) => {
          const { attachment } = props
          state.setCell(props.r, props.c, {
            v: attachment.id,
            m: attachment.fileName,
            att: attachment,
          })
          return true
        }
      },

      removeCellAttachment: (props: { r: number; c: number }) => {
        return ({ state }: CommandContext) => {
          const cell = state.getCellData(props.r, props.c)
          if (!cell?.att) return false
          state.deleteCell(props.r, props.c)
          return true
        }
      },
    }
  },
})

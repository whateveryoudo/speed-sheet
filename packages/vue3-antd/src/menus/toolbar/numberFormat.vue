<template>
  <a-dropdown
    v-model:open="open"
    :trigger="['click']"
    :disabled="!editableCpt"
    overlay-class-name="sheet-format-dropdown"
  >
    <s-keymap-tip :title="editableCpt ? t('toolbar.numberFormat') : null">
      <a-button
        type="text"
        class="shadow-btn-wrapper format-btn"
        :disabled="!editableCpt"
      >
        <span class="format-label">{{ currentFormatLabel }}</span>
        <CaretDownOutlined class="format-caret" />
      </a-button>
    </s-keymap-tip>

    <template #overlay>
      <a-menu
        class="format-menu-inner"
        :items="menuItems"
        @click="handleMenuClick"
      />
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { CaretDownOutlined, CheckOutlined } from '@ant-design/icons-vue'
import type { ItemType, MenuProps } from 'ant-design-vue'
import type { CellFormat } from '@speed-sheet/shared'
import { isDateFormatPattern } from '@speed-sheet/core'
import { useSheetToolbar } from '../../composables/useSheetToolbar'

export type FormatCategory =
  | 'general'
  | 'text'
  | 'number'
  | 'percent'
  | 'currency'
  | 'date'
  | 'time'
  | 'datetime'

const { t } = useI18n()
const open = ref(false)
const { sheet, editableCpt, activeCell, forEachSelectedCell, commitActiveEditor } = useSheetToolbar()

const currentFa = computed(() => activeCell.value?.ct?.fa ?? 'General')
const currentType = computed(() => activeCell.value?.ct?.t ?? 'g')

/**
 * 严格互斥的格式分类判断（避免货币或日期误判为普通数字）
 */
const currentCategory = computed<FormatCategory>(() => {
  const fa = currentFa.value
  const tType = currentType.value

  if (!fa || fa === 'General' || tType === 'g') return 'general'
  if (fa === '@' || tType === 's') return 'text'

  // 1. 货币优先判断（只要包含货币符号，一定是货币，绝不是普通数字）
  if (/[¥$€£]/.test(fa)) return 'currency'

  // 2. 百分比优先判断
  if (fa.includes('%')) return 'percent'

  // 3. 日期 / 时间判断
  if (tType === 'd' || isDateFormatPattern(fa)) {
    const hasTime =
      fa.includes('HH') ||
      fa.includes('mm') ||
      fa.includes('ss') ||
      fa.includes('PM') ||
      fa.includes('AM')
    const hasDate =
      fa.includes('YYYY') ||
      fa.includes('MM') ||
      fa.includes('DD') ||
      fa.includes('年') ||
      fa.includes('月') ||
      fa.includes('日') ||
      fa === '一月' ||
      fa === 'January' ||
      fa === 'Monday' ||
      fa === '星期一'

    if (hasTime && hasDate) return 'datetime'
    if (hasTime) return 'time'
    return 'date'
  }

  // 4. 普通数字（排除了货币、百分比、日期时间后，含有 0 或 # 或类型为 n）
  if (tType === 'n' || fa.includes('0') || fa.includes('#')) {
    return 'number'
  }

  return 'general'
})

const currentFormatLabel = computed(() => {
  switch (currentCategory.value) {
    case 'text':
      return t('toolbar.formatText')
    case 'number':
      return t('toolbar.formatNumber')
    case 'percent':
      return t('toolbar.formatPercent')
    case 'currency':
      return t('toolbar.formatCurrency')
    case 'date':
      return t('toolbar.formatDate')
    case 'time':
      return t('toolbar.formatTime')
    case 'datetime':
      return t('toolbar.formatDateTime')
    default:
      return t('toolbar.formatGeneral')
  }
})

const currencyOptions = [
  { fa: '¥#,##0.00', label: '¥ 人民币 (¥#,##0.00)' },
  { fa: '$#,##0.00', label: '$ 美元 ($#,##0.00)' },
  { fa: '€#,##0.00', label: '€ 欧元 (€#,##0.00)' },
  { fa: '£#,##0.00', label: '£ 英镑 (£#,##0.00)' },
]

const dateOptions = [
  { fa: 'YYYY-MM-DD', label: '2018-01-08' },
  { fa: 'YYYY/MM/DD', label: '2018/01/08' },
  { fa: 'MM/DD/YYYY', label: '01/08/2018' },
  { fa: 'YYYY.MM.DD', label: '2018.01.08' },
  { fa: 'YYYY-MM', label: '2018-01' },
  { fa: 'MM/DD', label: '01/08' },
  { fa: 'YYYY', label: '2018' },
  { fa: 'YYYY年M月D日', label: '2018年1月8日' },
  { fa: 'YYYY年M月', label: '2018年8月' },
  { fa: 'M月D日', label: '1月8日' },
  { fa: '一月', label: '一月' },
  { fa: '星期一', label: '星期一' },
  { fa: 'January 8, 2018', label: 'January 8, 2018' },
  { fa: 'January', label: 'January' },
  { fa: 'Monday', label: 'Monday' },
]

const timeOptions = [
  { fa: 'HH:mm:ss', label: '13:00:00' },
  { fa: '1:00:00 PM', label: '1:00:00 PM' },
  { fa: 'HH:mm', label: '13:00' },
  { fa: '1:00 PM', label: '1:00 PM' },
]

const dateTimeOptions = [
  { fa: 'YYYY-MM-DD HH:mm:ss', label: '2018-01-08 13:00:00' },
  { fa: 'YYYY/MM/DD HH:mm:ss', label: '2018/01/08 13:00:00' },
  { fa: 'YYYY/MM/DD 1:00 PM', label: '2018/01/08 1:00 PM' },
]

function renderCheckIcon(checked: boolean) {
  return checked
    ? h(CheckOutlined, {
        class: 'format-check-icon',
        style: {
          color: 'var(--ant-color-primary, #1890ff)',
          fontSize: '12px',
          verticalAlign: 'middle',
        },
      })
    : h('span', {
        class: 'format-check-placeholder',
        style: {
          display: 'inline-block',
          width: '12px',
          height: '12px',
          verticalAlign: 'middle',
        },
      })
}

const menuItems = computed<ItemType[]>(() => {
  const cat = currentCategory.value
  const fa = currentFa.value

  return [
    {
      key: 'General',
      label: t('toolbar.formatGeneral'),
      icon: () => renderCheckIcon(cat === 'general'),
    },
    {
      key: '@',
      label: t('toolbar.formatText'),
      icon: () => renderCheckIcon(cat === 'text'),
    },
    {
      key: '#,##0.00',
      label: t('toolbar.formatNumber'),
      icon: () => renderCheckIcon(cat === 'number'),
    },
    {
      key: '0.00%',
      label: t('toolbar.formatPercent'),
      icon: () => renderCheckIcon(cat === 'percent'),
    },
    {
      key: 'sub_currency',
      label: t('toolbar.formatCurrency'),
      icon: () => renderCheckIcon(cat === 'currency'),
      children: currencyOptions.map((c) => ({
        key: c.fa,
        label: c.label,
        icon: () => renderCheckIcon(cat === 'currency' && (fa === c.fa || (c.fa.includes('¥') && fa.includes('¥')))),
      })),
    },
    {
      key: 'sub_date',
      label: t('toolbar.formatDate'),
      icon: () => renderCheckIcon(cat === 'date'),
      children: dateOptions.map((d) => ({
        key: d.fa,
        label: `# ${d.label}`,
        icon: () => renderCheckIcon(cat === 'date' && fa === d.fa),
      })),
    },
    {
      key: 'sub_time',
      label: t('toolbar.formatTime'),
      icon: () => renderCheckIcon(cat === 'time'),
      children: timeOptions.map((tm) => ({
        key: tm.fa,
        label: `# ${tm.label}`,
        icon: () => renderCheckIcon(cat === 'time' && fa === tm.fa),
      })),
    },
    {
      key: 'sub_datetime',
      label: t('toolbar.formatDateTime'),
      icon: () => renderCheckIcon(cat === 'datetime'),
      children: dateTimeOptions.map((dt) => ({
        key: dt.fa,
        label: `# ${dt.label}`,
        icon: () => renderCheckIcon(cat === 'datetime' && fa === dt.fa),
      })),
    },
  ]
})

const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
  const selectedKey = String(key)
  if (!sheet.value) return

  // 点击父菜单项不生效（如 sub_date 等）
  if (selectedKey.startsWith('sub_')) return

  commitActiveEditor?.()

  let format: CellFormat
  if (selectedKey === 'General') {
    format = { fa: 'General', t: 'g' }
  } else if (selectedKey === '@') {
    format = { fa: '@', t: 's' }
  } else if (selectedKey === '0.00%') {
    format = { fa: '0.00%', t: 'n' }
  } else if (isDateFormatPattern(selectedKey)) {
    format = { fa: selectedKey, t: 'd' }
  } else {
    format = { fa: selectedKey, t: 'n' }
  }

  forEachSelectedCell((r, c) => {
    sheet.value!.chain().setCellFormat({ r, c, format }).run()
  })
  open.value = false
}
</script>

<style scoped lang="less">
.format-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  font-size: 12px;
  height: 28px;
}

.format-label {
  min-width: 32px;
  text-align: left;
}

.format-caret {
  font-size: 10px;
  color: var(--ant-color-text-tertiary, #999);
}

.format-menu-inner {
  min-width: 140px;
}

:deep(.format-check-icon) {
  font-size: 12px;
  color: var(--ant-color-primary, #1890ff);
  vertical-align: middle;
}

:deep(.format-check-placeholder) {
  display: inline-block;
  width: 12px;
  height: 12px;
  vertical-align: middle;
}
</style>

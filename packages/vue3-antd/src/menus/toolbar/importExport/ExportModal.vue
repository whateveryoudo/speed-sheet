<template>
  <a-modal
    :open="visible"
    title="文件导出"
    :width="540"
    :footer="null"
    centered
    destroy-on-close
    @cancel="handleClose"
  >
    <div class="format-select-container">
      <div
        v-for="item in exportItems"
        :key="item.key"
        class="format-card"
        :class="{ 'is-loading': loadingKey === item.key }"
        @click="handleExport(item)"
      >
        <div class="card-icon-wrapper" :style="{ backgroundColor: item.bg }">
          <component :is="item.icon" :style="{ color: item.color, fontSize: '36px' }" />
        </div>
        <div class="card-title">{{ item.label }}</div>
        <div class="card-desc">{{ item.desc }}</div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  FileExcelOutlined,
  FileTextOutlined,
  FileOutlined,
} from '@ant-design/icons-vue'
import { useSheetToolbar } from '../../../composables/useSheetToolbar'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
}>()

const { sheet } = useSheetToolbar()
const loadingKey = ref<string | null>(null)

interface ExportOption {
  key: 'xlsx' | 'speedsheet' | 'csv'
  label: string
  desc: string
  color: string
  bg: string
  icon: any
}

const exportItems: ExportOption[] = [
  {
    key: 'xlsx',
    label: 'Excel',
    desc: '.xlsx 电子表格',
    color: '#107c41',
    bg: '#e8f5e9',
    icon: FileExcelOutlined,
  },
  {
    key: 'speedsheet',
    label: 'SpeedSheet',
    desc: '.speedsheet 无损格式',
    color: '#1890ff',
    bg: '#e6f7ff',
    icon: FileTextOutlined,
  },
  {
    key: 'csv',
    label: 'CSV',
    desc: '.csv 逗号分隔文本',
    color: '#722ed1',
    bg: '#f9f0ff',
    icon: FileOutlined,
  },
]

function handleClose() {
  emit('update:visible', false)
}

async function handleExport(item: ExportOption) {
  const s = sheet.value
  if (!s) return
  if (loadingKey.value) return

  loadingKey.value = item.key
  const hide = message.loading(`正在准备导出 ${item.label}...`, 0)

  try {
    const commands = (s as any).commands || {}
    let success = false

    if (item.key === 'xlsx') {
      if (typeof commands.exportXlsx === 'function') {
        success = await commands.exportXlsx()()
      } else {
        message.warning('未检测到 Excel 导出能力，请在 extensions 中注入 ImportExportExtension 或配置后端接口')
        return
      }
    } else if (item.key === 'speedsheet') {
      if (typeof commands.exportSpeedSheet === 'function') {
        success = await commands.exportSpeedSheet()()
      } else {
        message.warning('未检测到 SpeedSheet 导出能力，请在 extensions 中注入 ImportExportExtension 或配置后端接口')
        return
      }
    } else if (item.key === 'csv') {
      if (typeof commands.exportCsv === 'function') {
        success = await commands.exportCsv()()
      } else {
        message.warning('未检测到 CSV 导出能力，请在 extensions 中注入 ImportExportExtension 或配置后端接口')
        return
      }
    }

    if (success) {
      message.success(`导出 ${item.label} 成功`)
      handleClose()
    }
  } catch (err: any) {
    message.error(`导出失败: ${err?.message || err}`)
  } finally {
    loadingKey.value = null
    hide()
  }
}
</script>

<style scoped>
.format-select-container {
  display: flex;
  justify-content: space-around;
  padding: 24px 8px;
  gap: 16px;
}

.format-card {
  width: 140px;
  padding: 16px 8px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
}

.format-card:hover {
  border-color: #1890ff;
  background-color: #f7faff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.12);
}

.card-icon-wrapper {
  width: 68px;
  height: 68px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  transition: transform 0.2s ease;
}

.format-card:hover .card-icon-wrapper {
  transform: scale(1.06);
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.card-desc {
  font-size: 12px;
  color: #8c8c8c;
  text-align: center;
}

.format-card.is-loading {
  opacity: 0.6;
  pointer-events: none;
}
</style>

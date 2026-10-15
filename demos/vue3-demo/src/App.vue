<template>
  <div class="sheet-wrapper">
    <!-- 顶部演示操作栏：测试一体化插件与工具栏模式切换 -->
    <div class="demo-plugin-bar">
      <span class="demo-title">🔌 一体化插件与工具栏演示:</span>
      <div class="demo-mode-group">
        <label>
          <input type="radio" value="custom" v-model="toolbarMode" />
          正向配置 (包含水印按钮)
        </label>
        <label>
          <input type="radio" value="exclude" v-model="toolbarMode" />
          反向排除 (排除 chart、freeze)
        </label>
        <label>
          <input type="radio" value="default" v-model="toolbarMode" />
          默认工具栏
        </label>
      </div>

      <div class="demo-actions">
        <button class="demo-btn" @click="handleToggleWatermark">
          代码调用命令: 切换水印
        </button>
        <button class="demo-btn" @click="handleChangeWatermarkText">
          代码调用命令: 修改文字
        </button>
        <button class="demo-btn demo-btn-primary" @click="handleFillData">
          批量填入数据
        </button>
      </div>
    </div>

    <!-- SpeedSheet 核心：
      1. 通过 :extensions 注入插件
      2. 通过 :toolbar-keys 正向定制（包括扩展自身注册的按钮）
      3. 或通过 :exclude-toolbar-keys 反向排除
    -->
    <SpeedSheet
      ref="speedSheetRef"
      :sheet-data="sheetData"
      :extensions="extensions"
      :toolbar-keys="currentToolbarKeys"
      :exclude-toolbar-keys="currentExcludeKeys"
      :show-toolbar="true"
      :show-sheet-tabs="true"
      :show-formula-bar="true"
      lang="zh"
      :on-change="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { SpeedSheet } from '@speed-sheet/vue3-antd'
import { luckysheetFileToSnapshot } from '@speed-sheet/core'
import type { WorkbookSnapshot } from '@speed-sheet/shared'
import { WatermarkExtension } from './plugins/watermark'

const speedSheetRef = ref<InstanceType<typeof SpeedSheet> | null>(null)
const toolbarMode = ref<'custom' | 'exclude' | 'default'>('custom')

// 1. 插件注册注入：通过 .configure() 传入个性化配置
const extensions = [
  WatermarkExtension.configure({
    text: '机密文档 · 插件演示',
    color: 'rgba(24, 144, 255, 0.12)',
    fontSize: 22,
  }),
]

// 2. 正向配置：自由编排工具栏，将插件注册的 'watermark' 按钮放在工具栏上！
const customToolbarKeys = [
  'undo', 'redo', '|',
  'bold', 'italic', 'textColor', 'backgroundColor', '|',
  'fontSize', 'border', 'align', '|',
  'watermark', '|', // <-- 扩展自带的工具栏按钮直接声明使用！
  'chart',
]

// 3. 反向排除：排除掉不需要的内置按钮
const excludeKeys = ['chart', 'freeze', 'protect']

const currentToolbarKeys = computed(() => {
  return toolbarMode.value === 'custom' ? customToolbarKeys : undefined
})

const currentExcludeKeys = computed(() => {
  return toolbarMode.value === 'exclude' ? excludeKeys : undefined
})

// 初始表格数据
const sheetData = ref<WorkbookSnapshot>(
  luckysheetFileToSnapshot([
    {
      name: '员工名单',
      data: [
        ['姓名', '部门', '入职年份', '考核得分'],
        ['张三', '技术部', 2021, 95],
        ['李四', '产品部', 2022, 88],
        ['王五', '运营部', 2023, 92],
      ],
    },
  ])
)

function onChange(snapshot: WorkbookSnapshot): void {
  console.log('[WorkbookSnapshot changed]', snapshot)
  sheetData.value = snapshot
}

// 外部随时调用插件注册的自定义 Command：sheet.commands.toggleWatermark()
function handleToggleWatermark() {
  const sheet = speedSheetRef.value?.sheet
  if (sheet?.commands.toggleWatermark) {
    sheet.commands.toggleWatermark()
  }
}

// 外部随时调用插件注册的自定义 Command：sheet.commands.setWatermarkText()
function handleChangeWatermarkText() {
  const sheet = speedSheetRef.value?.sheet
  const text = window.prompt('请输入新的水印文字：', '绝密 · 严禁外泄')
  if (text && sheet?.commands.setWatermarkText) {
    sheet.commands.setWatermarkText(text)
  }
}

// 动态用数字索引批量填充数据
function handleFillData() {
  const sheet = speedSheetRef.value?.sheet
  if (!sheet) return
  sheet
    .chain()
    .setCellValue({ r: 4, c: 0, value: '赵六' })
    .setCellValue({ r: 4, c: 1, value: '市场部' })
    .setCellValue({ r: 4, c: 2, value: 2024 })
    .setCellValue({ r: 4, c: 3, value: 98 })
    .run()
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.sheet-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.demo-plugin-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f7f9fa;
  border-bottom: 1px solid #e1e4e8;
  font-size: 13px;
  z-index: 100;
  flex-wrap: wrap;
  gap: 12px;
}

.demo-title {
  font-weight: 600;
  color: #333;
}

.demo-mode-group {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: #555;
}

.demo-mode-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.demo-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.demo-btn {
  padding: 4px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.demo-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.demo-btn-primary {
  background: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.demo-btn-primary:hover {
  background: #40a9ff;
  color: #fff;
}
</style>

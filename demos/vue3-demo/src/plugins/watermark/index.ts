import { Extension, VueSheetOverlayRenderer } from '@speed-sheet/vue3-antd'
import WatermarkLayer from './WatermarkLayer.vue'
import WatermarkToolbarButton from './WatermarkToolbarButton.vue'

export interface WatermarkOptions {
  text?: string
  color?: string
  fontSize?: number
}

export interface WatermarkStorage {
  visible: boolean
  text: string
}

/**
 * 示例一体化插件：WatermarkExtension（带业务逻辑、自定义命令与 UI 视图）
 *
 * 使用方式：
 * const extensions = [
 *   WatermarkExtension.configure({
 *     text: '公司机密 · 禁止外传',
 *     color: 'rgba(255, 0, 0, 0.12)',
 *   })
 * ]
 * <SpeedSheet :extensions="extensions" />
 */
export const WatermarkExtension = Extension.create<WatermarkStorage>({
  name: 'watermark',

  // 1. 默认配置选项（支持 .configure 动态覆盖）
  addOptions() {
    return {
      text: '内部保密 · SPEED SHEET',
      color: 'rgba(24, 144, 255, 0.12)',
      fontSize: 22,
    }
  },

  // 2. 插件独立存储与状态
  addStorage() {
    return {
      visible: true,
      text: '',
    }
  },

  // 3. 注册插件独有命令：sheet.commands.toggleWatermark() 等
  addCommands({ sheet }) {
    return {
      toggleWatermark: () => () => {
        const ext = sheet.extensions.find((e) => e.name === 'watermark')
        if (ext) {
          ext.storage.visible = !ext.storage.visible
          sheet.notifyUpdate()
          return true
        }
        return false
      },
      setWatermarkText: (newText: string) => () => {
        const ext = sheet.extensions.find((e) => e.name === 'watermark')
        if (ext) {
          ext.storage.text = newText
          sheet.notifyUpdate()
          return true
        }
        return false
      },
    }
  },

  // 4. 注册 UI 视图（一体包直接绑定 Vue 视图）
  addNodeView() {
    return VueSheetOverlayRenderer(WatermarkLayer)
  },

  // 5. 注册工具栏按钮（让该插件能直接作为工具项出现在 Toolbar 上）
  addToolbarItem() {
    return {
      key: 'watermark',
      component: WatermarkToolbarButton,
    }
  },
})

export { WatermarkLayer, WatermarkToolbarButton }

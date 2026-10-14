<template>
  <div v-if="active" class="s-resize-handles">
    <div
      v-for="h in handles"
      :key="h"
      class="s-resize-handle"
      :class="`handle-${h}`"
      :style="{
        '--handle-size': `${size}px`,
        '--handle-color': color,
      }"
      @mousedown.stop.prevent="emit('resize-start', h, $event)"
    />
  </div>
</template>

<script setup lang="ts">
import type { ResizeHandleDirection } from '../composables/useBoxResize'

defineOptions({
  name: 'SResizeHandles',
})

const props = withDefaults(
  defineProps<{
    active?: boolean
    color?: string
    size?: number
    /** 可选控制显示的句柄，默认为全 8 向 */
    handles?: ResizeHandleDirection[]
  }>(),
  {
    active: true,
    color: 'var(--ant-color-primary, #1677ff)',
    size: 8,
    handles: () => ['tl', 't', 'tr', 'r', 'br', 'b', 'bl', 'l'],
  },
)

const emit = defineEmits<{
  'resize-start': [handle: ResizeHandleDirection, event: MouseEvent]
}>()
</script>

<style scoped>
.s-resize-handles {
  pointer-events: none;
}

.s-resize-handle {
  position: absolute;
  width: var(--handle-size, 8px);
  height: var(--handle-size, 8px);
  background: var(--handle-color, #1677ff);
  border: 1px solid #ffffff;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.25);
  border-radius: 0;
  pointer-events: auto;
  z-index: 40;
  box-sizing: border-box;
}

/* 扩展隐形点击/拖拽热区（18px x 18px），极大提升鼠标命中手感 */
.s-resize-handle::before {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
}

.handle-tl {
  top: 0;
  left: 0;
  transform: translate(-50%, -50%);
  cursor: nwse-resize;
}

.handle-t {
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  cursor: ns-resize;
}

.handle-tr {
  top: 0;
  right: 0;
  transform: translate(50%, -50%);
  cursor: nesw-resize;
}

.handle-r {
  top: 50%;
  right: 0;
  transform: translate(50%, -50%);
  cursor: ew-resize;
}

.handle-br {
  bottom: 0;
  right: 0;
  transform: translate(50%, 50%);
  cursor: nwse-resize;
}

.handle-b {
  bottom: 0;
  left: 50%;
  transform: translate(-50%, 50%);
  cursor: ns-resize;
}

.handle-bl {
  bottom: 0;
  left: 0;
  transform: translate(-50%, 50%);
  cursor: nesw-resize;
}

.handle-l {
  top: 50%;
  left: 0;
  transform: translate(-50%, -50%);
  cursor: ew-resize;
}
</style>

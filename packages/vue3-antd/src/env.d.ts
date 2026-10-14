/// <reference types="vite/client" />

declare namespace JSX {
  interface IntrinsicElements {
    [elem: string]: unknown
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module 'speed-components-ui/components' {
  import type { DefineComponent, App, Plugin } from 'vue'
  export const ResizeHandles: DefineComponent<any, any, any>
  export const SResizeHandles: DefineComponent<any, any, any>
  export function ensureSpeedComponents(app: App, config?: any): void
  export function isSpeedComponentsInstalled(app: App): boolean
  const SpeedComponentsPlugin: Plugin
  export default SpeedComponentsPlugin
}

declare module 'speed-components-ui/hooks' {
  import type { Ref } from 'vue'
  export type ResizeHandleDirection = 'tl' | 't' | 'tr' | 'r' | 'br' | 'b' | 'bl' | 'l'
  export interface BoxRect {
    left: number
    top: number
    width: number
    height: number
  }
  export interface UseBoxResizeOptions {
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number
    lockAspectRatio?: boolean
    onResizeStart?: (handle: ResizeHandleDirection, startRect: BoxRect) => void
    onResizing?: (newRect: BoxRect, handle: ResizeHandleDirection) => void
    onResizeEnd?: (finalRect: BoxRect, handle: ResizeHandleDirection) => void
  }
  export interface UseBoxResizeReturn {
    isResizing: Ref<boolean>
    activeHandle: Ref<ResizeHandleDirection | null>
    startResize: (handle: ResizeHandleDirection, startRect: BoxRect, startEvent: MouseEvent) => void
  }
  export function useBoxResize(options?: UseBoxResizeOptions): UseBoxResizeReturn
  export function useCustomUpload(options?: any): any
}


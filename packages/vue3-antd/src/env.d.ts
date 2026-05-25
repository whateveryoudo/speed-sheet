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

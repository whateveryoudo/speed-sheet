import { createApp } from 'vue'
import App from './App.vue'
import SpeedSheetUi from '@speed-sheet/vue3-antd'
import 'uno.css'

const app = createApp(App)
app.use(SpeedSheetUi, {
  iconfontUrl: [],
})
app.mount('#app')

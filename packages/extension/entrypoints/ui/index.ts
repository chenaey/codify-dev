import 'overlayscrollbars/styles/overlayscrollbars.css'

import { getCurrentPlatform, Platform } from '@/utils/platform'

import './style.css'

// 根据当前平台，动态加载兼容性 CSS
if (getCurrentPlatform() === Platform.MasterGo) {
  import('./figma-compat.css')
}

export default defineUnlistedScript(async () => {
  import('./prism')

  const App = (await import('./App.vue')).default

  createApp(App).mount('tempad')
})
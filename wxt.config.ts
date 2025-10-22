import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vite: () => ({
    plugins: [cssInjectedByJsPlugin()],
    optimizeDeps: {
      include: []
    },
    build: {
      minify: false,
      sourcemap: true,
      rollupOptions: {
        output: {
          format: 'iife',
          compact: false,
        }
      }
    }
  }),
  webExt: {
    disabled: true
  },
  manifest: {
    name: 'CODIFY DEV',
    web_accessible_resources: [
      {
        resources: ['/ui.js'],
        matches: ['https://www.figma.com/*', 'https://mastergo.netease.com/*']
      },
      {
        resources: ['/codegen.js'],
        matches: ['https://www.figma.com/*', 'https://mastergo.netease.com/*']
      }
    ],
    permissions: ['declarativeNetRequest', 'declarativeNetRequestWithHostAccess'],
    host_permissions: [
      'https://www.figma.com/file/*',
      'https://www.figma.com/design/*',
      'https://mastergo.netease.com/file/*'
    ],
    declarative_net_request: {
      rule_resources: [
        {
          id: 'figma',
          enabled: true,
          path: 'rules/figma.json'
        }
      ]
    }
  }
})

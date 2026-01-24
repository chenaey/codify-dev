import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import { defineConfig } from 'wxt'

const newElements = ['selectedcontent']

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  vue: {
    vite: {
      template: {
        compilerOptions: {
          isCustomElement: (tag) => newElements.includes(tag)
        }
      }
    }
  },
  vite: (env) => ({
    plugins: [cssInjectedByJsPlugin()],
    optimizeDeps: {
      include: []
    },
    define: {
      __DEV__: env.mode === 'development'
    },
    build: {
      minify: false,
      sourcemap: true
    }
  }),
  webExt: {
    disabled: true
  },
  manifest: {
    name: 'CODIFY DEV',
    web_accessible_resources: [
      {
        resources: ['/ui.js', '/loader.js', '/figma.js', '/codegen.js'],
        matches: ['https://www.figma.com/*', 'https://mastergo.netease.com/*']
      }
    ],
    permissions: ['declarativeNetRequest', 'declarativeNetRequestWithHostAccess'],
    host_permissions: ['https://www.figma.com/*', 'https://mastergo.netease.com/file/*'],
    declarative_net_request: {
      rule_resources: [
        {
          id: 'figma',
          enabled: true,
          path: 'rules/figma.json'
        }
      ]
    }
  },
  zip: {
    artifactTemplate: 'codify-dev-{{version}}-{{browser}}.zip'
  }
})

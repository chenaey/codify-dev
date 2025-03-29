import { definePlugin } from '@tempad-dev/plugins'

import { PROJECTS, DEFAULT_CONFIG, getProjectConfig } from './config'
import processedValue from './utils/processedValue'

export { PROJECTS as projects }

export default definePlugin({
  name: 'CBG FED',
  code: {
    css: {
      title: 'CSS',
      lang: 'css',
      transform({ style, options }) {
        console.log('Transform called with:', { style, options })

        // 根据project参数获取对应配置
        const projectConfig = options.project ? getProjectConfig(options.project) : DEFAULT_CONFIG

        return Object.entries(style)
          .filter(([key]) => !projectConfig.disallowedProperties.includes(key))
          .filter(([key, value]) => {
            if (!(key in projectConfig.defaultValues)) {
              return true
            }
            return projectConfig.defaultValues[key] !== value
          })
          .map(([key, value]) => {
            console.log('[Processing]', { key, value })
            const processedVal = processedValue(key, value, {
              ...options,
              rootFontSize: projectConfig.rootFontSize,
              scale: projectConfig.scale
            })
            return `${key}: ${processedVal};`
          })
          .join('\n')
      }
    }
  }
}) 
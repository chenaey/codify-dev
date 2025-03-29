import { definePlugin } from '@tempad-dev/plugins'

import { PROJECTS, DEFAULT_CONFIG, getProjectConfig, type CurrentConfig } from './config'
import { extractDefaultValue, convertLineHeight, convertUnit } from './utils'
import parse from './utils/processedValue.ts'

// 当前配置
let currentConfig: CurrentConfig = {
  defaultValues: DEFAULT_CONFIG.defaultValues,
  disallowedProperties: DEFAULT_CONFIG.disallowedProperties || []
}

// 导出项目配置供外部使用
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
        const projectConfig = (options as any).project ? getProjectConfig((options as any).project as string) : DEFAULT_CONFIG
        
        // 更新当前配置
        currentConfig = {
          defaultValues: projectConfig.defaultValues,
          disallowedProperties: projectConfig.disallowedProperties || []
        }
        
        return Object.entries(style)
          .filter(([key]) => !currentConfig.disallowedProperties.includes(key))
          // .filter(([key, value]) => {
          //   const actualValue = extractDefaultValue(value)
          //   if (!(key in currentConfig.defaultValues)) {
          //     return true
          //   }
          //   return currentConfig.defaultValues[key] !== actualValue
          // })
          .map(([key, value]) => {
            const processedValue = parse(key,value, {
              ...options,
              ...projectConfig
            });
            
            // // 特殊处理line-height
            // if (key === 'line-height') {
            //   processedValue = convertLineHeight(processedValue, style['font-size'], {
            //     ...options,
            //     rootFontSize: projectConfig.rootFontSize,
            //     scale: projectConfig.scale
            //   })
            // } else {
            //   processedValue = convertUnit(processedValue, {
            //     ...options,
            //     project: (options as any).project,
            //     rootFontSize: projectConfig.rootFontSize,
            //     scale: projectConfig.scale
            //   })
            // }
            
            return `${key}: ${processedValue};`
          })
          .join('\n')
      }
    }
  }
}) 
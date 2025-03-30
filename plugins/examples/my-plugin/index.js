import { definePlugin } from '@tempad-dev/plugins'

import { PROJECTS } from './config'
import parsedStyle from './utils/processedValue'

export { PROJECTS as projects }

export default definePlugin({
  name: 'CBG FED',
  code: {
    css: {
      title: 'Style',
      lang: 'css',
      transform({ style, options }) {
        // console.log('Transform called with:', { style, options })
        console.log('[Transform]', style, options)
        return parsedStyle(style, options)
      }
    },
    js: false
  }
}) 
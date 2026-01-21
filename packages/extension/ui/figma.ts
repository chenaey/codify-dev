import { reactive } from 'vue'

import { getCurrentPlatform, Platform } from '@/utils/platform'

const NATIVE_PANEL_WIDTH = 241
const TEMPAD_PANEL_WIDTH = 300
const TEMPAD_PANEL_MAX_WIDTH = 500
const TEMPAD_PANEL_MIN_HEIGHT = 40
const TEMPAD_PANEL_SPACING = 12

const ui = reactive({
  get nativePanelWidth() {
    return NATIVE_PANEL_WIDTH
  },

  get tempadPanelWidth() {
    return TEMPAD_PANEL_WIDTH
  },

  get tempadPanelMaxWidth() {
    return TEMPAD_PANEL_MAX_WIDTH
  },

  get tempadPanelMinHeight() {
    return TEMPAD_PANEL_MIN_HEIGHT
  },

  get topBoundary() {
    const platform = getCurrentPlatform()
    if (platform === Platform.MasterGo) {
      return 0 // MasterGo 上暂时不限制顶部边界，允许自由拖动
    }
    return sumLength(TEMPAD_PANEL_SPACING, '--editor-banner-height')
  },

  get bottomBoundary() {
    const platform = getCurrentPlatform()
    if (platform === Platform.MasterGo) {
      return 0 // MasterGo 上暂时不限制底部边界，允许自由拖动
    }
    return TEMPAD_PANEL_SPACING
  }
})

function sumLength(...values: (string | number)[]): number {
  return values.reduce((total: number, val: string | number) => {
    if (typeof val === 'string') {
      return total + parseInt(getComputedStyle(document.body).getPropertyValue(val), 10)
    } else {
      return total + val
    }
  }, 0)
}

export { ui }

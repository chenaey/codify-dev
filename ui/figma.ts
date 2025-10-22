import { getCurrentPlatform, Platform } from '@/utils/platform'
import { reactive } from 'vue'

const NATIVE_PANEL_WIDTH = 241
const TEMPAD_PANEL_WIDTH = 300

const ui = reactive({
  isUi3: false,

  get nativePanelWidth() {
    return NATIVE_PANEL_WIDTH
  },

  get tempadPanelWidth() {
    return TEMPAD_PANEL_WIDTH
  },

  get topBoundary() {
    const platform = getCurrentPlatform();
    if (platform === Platform.MasterGo) {
      return 0; // MasterGo 上暂时不限制顶部边界，允许自由拖动
    }
    return sumLength(this.isUi3 ? 12 : '--toolbar-height', '--editor-banner-height')
  },

  get bottomBoundary() {
    const platform = getCurrentPlatform();
    if (platform === Platform.MasterGo) {
      return 0; // MasterGo 上暂时不限制底部边界，允许自由拖动
    }
    return this.isUi3 ? 12 : 0
  }
})

function updateIsUi3() {
  ui.isUi3 = document.body.dataset.fplVersion === 'ui3'
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'attributes' && mutation.attributeName === 'data-fpl-version') {
      updateIsUi3()
      break
    }
  }
})

updateIsUi3()
observer.observe(document.body, {
  attributes: true,
  attributeFilter: ['data-fpl-version']
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
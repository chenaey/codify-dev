import { useStorage, computedAsync } from '@vueuse/core'
import { shallowRef, computed } from 'vue'

import { getTemPadComponent } from '@/utils'
import { isMasterGo } from '@/utils/platform'

import { ui } from './figma'

interface PluginData {
  name: string
  code: string
  source: string
}

export type Options = {
  minimized: boolean
  panelPosition: {
    left: number
    top: number
    width?: number
  }
  project: string
  prefOpen: boolean
  deepSelectOn: boolean
  measureOn: boolean
  exportOn: boolean
  cssUnit: 'px' | 'rem'
  rootFontSize: number
  scale: number
  exportOpen: boolean
  mcpOn: boolean
  skillOn: boolean
  plugins: {
    [source: string]: PluginData
  }
  activePluginSource: string | null
  apiSettings?: {
    apiKey?: string
    baseURL?: string
    modelName?: string
    showApiSettings?: boolean
  }
}

export type ScaleSelectionType = {
  scale: string
  suffix: string
  fileType: 'PNG' | 'JPG' | 'SVG'
}

export type SelectionNode = SceneNode & {
  width: number
  height: number
  exportAsync: (settings: {
    format: 'PNG' | 'JPG' | 'SVG'
    constraint: { type: 'SCALE'; value: number }
    suffix?: string
  }) => Promise<Uint8Array>
}

export const options = useStorage<Options>('tempad-dev', {
  minimized: false,
  panelPosition: {
    left: window.innerWidth - ui.nativePanelWidth - ui.tempadPanelWidth,
    top: ui.topBoundary,
    width: ui.tempadPanelWidth
  },
  prefOpen: false,
  deepSelectOn: !isMasterGo(),
  measureOn: !isMasterGo(),
  exportOn: false,
  project: 'mvvm',
  cssUnit: 'px',
  rootFontSize: 20,
  exportOpen: true,
  scale: 1,
  mcpOn: false,
  skillOn: false,
  plugins: {},
  activePluginSource: null,
  apiSettings: {
    apiKey: '',
    modelName: 'deepseek-chat',
    baseURL: 'https://api.deepseek.com/v1',
    showApiSettings: false
  }
})

export const runtimeMode = shallowRef<'standard' | 'unavailable'>('standard')
export const layoutReady = shallowRef(false)
export const selection = shallowRef<readonly SceneNode[]>([])
export const selectedNode = computed(() => selection.value?.[0] ?? null)
export const selectedTemPadComponent = computed(() => getTemPadComponent(selectedNode.value))

export const activePlugin = computedAsync(async () => {
  if (!options.value.activePluginSource) {
    return null
  }

  return options.value.plugins[options.value.activePluginSource]
}, null)

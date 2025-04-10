import { getTemPadComponent } from '@/utils'
import { useStorage, computedAsync } from '@vueuse/core'
import { shallowRef, computed } from 'vue'

import type { QuirksNode, GhostNode } from './quirks'

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
  plugins: {
    [source: string]: PluginData
  }
  activePluginSource: string | null
}

export type ScaleSelectionType = {
  scale: string
  suffix: string
  fileType: 'PNG' | 'JPG' | 'SVG'
}

export type SelectionNode =
  | (SceneNode & {
      width: number
      height: number
      exportAsync: (settings: {
        format: 'PNG' | 'JPG' | 'SVG'
        constraint: { type: 'SCALE'; value: number }
        suffix?: string
      }) => Promise<Uint8Array>
    })
  | QuirksNode
  | GhostNode

export const options = useStorage<Options>('cbg-dev-options-state', {
  minimized: false,
  panelPosition: {
    left: window.innerWidth - ui.nativePanelWidth - ui.tempadPanelWidth,
    top: ui.topBoundary
  },
  prefOpen: false,
  deepSelectOn: true,
  measureOn: true,
  exportOn: false,
  project: 'mvvm',
  cssUnit: 'px',
  rootFontSize: 20,
  exportOpen: true,
  scale: 1,
  plugins: {},
  activePluginSource: null
})

export const isQuirksMode = shallowRef<boolean>(false)
export const runtimeMode = shallowRef<'standard' | 'quirks' | 'unavailable'>('standard')
export const selection = shallowRef<readonly SelectionNode[]>([])
export const selectedNode = computed(() => selection.value?.[0] ?? null)
export const selectedTemPadComponent = computed(() => getTemPadComponent(selectedNode.value))

export const activePlugin = computedAsync(async () => {
  if (!options.value.activePluginSource) {
    return null
  }

  return options.value.plugins[options.value.activePluginSource]
}, null)

import { getCurrentPlatform, Platform } from '@/utils/platform'

export function getCanvas() {
  // Need to ensure the whole plugin is rendered after canvas is ready
  // so that we can cast the result to HTMLElement here.
  // The layout readiness check lives in App.vue.
  return document.querySelector<HTMLElement>('canvas')
}

export function getLeftPanel() {
  const platform = getCurrentPlatform();
  if (platform === Platform.MasterGo) {
    return document.querySelector('.left-bar') as HTMLElement;
  }

  // Figma's original selector
  return document.querySelector('#left-panel-container') as HTMLElement
}

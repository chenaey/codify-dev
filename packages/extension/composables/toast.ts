import { shallowRef } from 'vue'

import { isMasterGo } from '@/utils/platform'

let tick: number | null = null
const duration = 3000

// 用于自定义 Toast 的响应式状态（MasterGo 平台使用）
export const toastMessage = shallowRef('')
export const toastShown = shallowRef(false)

export function useToast() {
  let active: NotificationHandler | null = null

  function hide() {
    if (isMasterGo()) {
      toastMessage.value = ''
      toastShown.value = false
      if (tick != null) {
        clearTimeout(tick)
        tick = null
      }
    } else {
      if (active) {
        active.cancel()
        active = null
      }
    }
  }

  return {
    show(msg: string) {
      if (isMasterGo()) {
        // MasterGo: 使用自定义 Toast
        if (tick != null) {
          clearTimeout(tick)
        }
        toastMessage.value = msg
        toastShown.value = true

        tick = window.setTimeout(() => {
          hide()
        }, duration)
      } else {
        // Figma: 使用原生 notify API
        active = figma.notify(msg)
      }
    },
    hide,
    shown: toastShown,
    message: toastMessage
  }
}
/**
 * 日志上报工具
 *
 * 使用方式:
 *   import { track } from '@/utils/tracker'
 *   track('copy_code')
 */

import { getCurrentPlatform, Platform } from '@/utils/platform'

const TRACKER_ENDPOINT = 'https://sigma-other-cbg.proxima.nie.netease.com/1.gif'
const MISC_TYPE_PREFIX = 'codify_dev_'

function getInfo(): string {
  const platform = getCurrentPlatform()
  const platformName =
    platform === Platform.MasterGo ? 'mastergo' : platform === Platform.Figma ? 'figma' : 'unknown'

  // 获取用户 ID（Figma / MasterGo）
  let userId = ''
  try {
    if (platform === Platform.Figma && window.figma?.currentUser?.id) {
      userId = window.figma.currentUser.id
    } else if (platform === Platform.MasterGo) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mg = (window as any).mg
      if (mg?.currentUser?.id) {
        userId = mg.currentUser.id
      }
    }
  } catch {
    // ignore
  }

  return JSON.stringify({ platform: platformName, userId })
}

export function track(type: string): void {
  try {
    const info = encodeURIComponent(getInfo())
    const img = new Image()
    img.src = `${TRACKER_ENDPOINT}?log=misc&misc_type=${MISC_TYPE_PREFIX}${type}&info=${info}`
  } catch {
    // ignore
  }
}

// 移除远程URL，改为使用本地打包的规则文件
// const RULE_URL = 'https://raw.githubusercontent.com/ecomfe/tempad-dev/refs/heads/main/public/rules/figma.json'
import { RULES_URL } from '@/rewrite/shared'
import rules from '@/public/rules/figma.json'
import type { Rules } from '../types/rewrite'

// 移除定时同步相关代码
// const SYNC_ALARM = 'sync-rules'
// const SYNC_INTERVAL_MINUTES = 10

async function initializeRules() {
  try {
    // 使用manifest中定义的静态规则集，无需动态加载

    // let newRules: Rules

    // if (import.meta.env.DEV) {
    //   newRules = rules as Rules
    //   console.log('[tempad-dev] Loaded local rules (dev).')
    // } else {
    //   const res = await fetch(RULES_URL, { cache: 'no-store' })
    //   if (!res.ok) {
    //     console.error('[tempad-dev] Failed to fetch rules:', res.statusText)
    //     return
    //   }

    //   newRules = (await res.json()) as Rules
    // }

    // const oldIds = (await browser.declarativeNetRequest.getDynamicRules()).map(({ id }) => id)

    await browser.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['figma']
    })
    console.log('[tempad-dev] Enabled figma rules from static resource.')
  } catch (error) {
    console.error('[tempad-dev] Error initializing rules:', error)
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(initializeRules)
  browser.runtime.onStartup.addListener(initializeRules)
  
  // 移除定时同步功能
  // browser.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES })
  // browser.alarms.onAlarm.addListener((a) => {
  //   if (a.name === SYNC_ALARM) {
  //     fetchRules()
  //   }
  // })
})

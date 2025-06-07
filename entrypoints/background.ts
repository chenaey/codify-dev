// 移除远程URL，改为使用本地打包的规则文件
// const RULE_URL = 'https://raw.githubusercontent.com/ecomfe/tempad-dev/refs/heads/main/public/rules/figma.json'

// 移除定时同步相关代码
// const SYNC_ALARM = 'sync-rules'
// const SYNC_INTERVAL_MINUTES = 10

async function initializeRules() {
  try {
    // 使用manifest中定义的静态规则集，无需动态加载
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

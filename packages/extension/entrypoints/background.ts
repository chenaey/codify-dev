import rules from '@/public/rules/figma.json'
import { RULES_URL } from '@/rewrite/shared'
import { logger } from '@/utils/log'

import type { Rules } from '../types/rewrite'

const SYNC_ALARM = 'sync-rules'
const SYNC_INTERVAL_MINUTES = 10

async function initializeRules() {
  try {
    let newRules: Rules

    if (import.meta.env.DEV) {
      newRules = rules as Rules
      logger.log('Loaded local rules (dev).')
    } else {
      const res = await fetch(RULES_URL, { cache: 'no-store' })
      if (!res.ok) {
        logger.error('Failed to fetch rules:', res.statusText)
        return
      }

      newRules = (await res.json()) as Rules
    }

    const oldIds = (await browser.declarativeNetRequest.getDynamicRules()).map(({ id }) => id)

    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: oldIds,
      addRules: newRules
    })
    logger.log(`Updated ${newRules.length} rule${newRules.length === 1 ? '' : 's'}.`)
  } catch (error) {
    logger.error('Error fetching rules:', error)
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(initializeRules)
  browser.runtime.onStartup.addListener(initializeRules)

  browser.alarms.create(SYNC_ALARM, { periodInMinutes: SYNC_INTERVAL_MINUTES })
  browser.alarms.onAlarm.addListener((a) => {
    if (a.name === SYNC_ALARM) {
      initializeRules()
    }
  })
})

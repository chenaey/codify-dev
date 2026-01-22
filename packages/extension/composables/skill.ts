// Skill connection composable (independent from MCP)

import { createSharedComposable, useDocumentVisibility, useIdle, useWindowFocus } from '@vueuse/core'
import { computed, shallowRef, watch } from 'vue'

import {
  activateSkill,
  isSkillConnected,
  skillActiveId,
  skillCount,
  skillSelfId,
  startSkillConnection,
  stopSkillConnection
} from '@/skill'
import { layoutReady, options, runtimeMode, selection } from '@/ui/state'
import { logger } from '@/utils/log'

export type SkillStatus = 'disabled' | 'connecting' | 'connected' | 'error'

const IDLE_TIMEOUT_MS = 10000

export const useSkill = createSharedComposable(() => {
  const errorMessage = shallowRef<string | null>(null)

  const documentVisibility = useDocumentVisibility()
  const { idle } = useIdle(IDLE_TIMEOUT_MS)
  const focused = useWindowFocus()

  const isWindowActive = computed(() => {
    return documentVisibility.value === 'visible' && !idle.value && focused.value
  })

  // Derived status from connection state
  // Note: skillSelfId is set only when registered (connected + handshake complete)
  const status = computed<SkillStatus>(() => {
    if (!options.value.skillOn) {
      return 'disabled'
    }
    // skillSelfId.value is reactive and only set after successful registration
    if (skillSelfId.value) {
      return 'connected'
    }
    return 'connecting'
  })

  // Whether this instance is the active one
  const selfActive = computed(() => {
    return !!skillSelfId.value && skillSelfId.value === skillActiveId.value
  })

  // Re-export reactive state
  const count = skillCount
  const activeId = skillActiveId
  const selfId = skillSelfId

  function start() {
    errorMessage.value = null
    startSkillConnection()
    logger.log('[Skill] Connection started via composable')
  }

  function stop() {
    stopSkillConnection()
    errorMessage.value = null
    logger.log('[Skill] Connection stopped via composable')
  }

  function activate() {
    if (isSkillConnected()) {
      activateSkill()
    }
  }

  // Watch skillOn option
  watch(
    () => options.value.skillOn,
    (enabled) => {
      if (enabled && runtimeMode.value === 'standard' && layoutReady.value) {
        start()
      } else {
        stop()
      }
    },
    { immediate: true }
  )

  // Watch window active state
  watch(isWindowActive, (active) => {
    if (active && options.value.skillOn && layoutReady.value && !isSkillConnected()) {
      start()
    }
  })

  // Watch layout ready
  watch(layoutReady, (ready) => {
    if (!ready) {
      stop()
      return
    }
    if (runtimeMode.value === 'standard' && options.value.skillOn) {
      start()
    }
  })

  // 当用户在当前标签页选中元素时，自动激活当前标签页
  // 这样用户不需要手动点击"激活"按钮
  watch(
    () => selection.value,
    (newSelection) => {
      // 只在以下条件都满足时自动激活：
      // 1. Skill 已连接
      // 2. 有选中的元素
      // 3. 当前标签页不是活跃的
      // 4. 窗口是活跃的（用户正在操作）
      if (
        status.value === 'connected' &&
        newSelection.length > 0 &&
        !selfActive.value &&
        isWindowActive.value
      ) {
        logger.log('[Skill] Auto-activating due to selection change...')
        activate()
      }
    }
  )

  return {
    status,
    selfActive,
    count,
    activeId,
    selfId,
    errorMessage,
    activate
  }
})
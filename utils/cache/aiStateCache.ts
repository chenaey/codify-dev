import { useStorage } from '@vueuse/core'
import type { GenerationState } from '@/composables/useAICodeGeneration'

// 最大缓存数量
const MAX_CACHE_SIZE = 10

// 定义缓存类型
interface AiStateCache {
  states: Record<string, GenerationState>
  // 按时间顺序存储的keys，用于LRU缓存管理
  keys: string[]
}

// 初始化本地存储
const cache = useStorage<AiStateCache>('tempad-ai-state-cache', {
  states: {},
  keys: []
})

/**
 * 保存状态到缓存
 */
export function saveStateToCache(stateKey: string, state: GenerationState): void {
  // 只缓存完成状态的生成结果
  if (state.status !== 'completed' || !state.code) {
    return
  }

  // 如果已存在此key，先移除
  const keyIndex = cache.value.keys.indexOf(stateKey)
  if (keyIndex !== -1) {
    cache.value.keys.splice(keyIndex, 1)
  }

  // 克隆一份状态进行缓存，移除不需要缓存的属性
  const stateToCache: GenerationState = {
    code: state.code,
    status: state.status,
    controller: null,
    resources: state.resources
  }

  // 添加到缓存
  cache.value.states[stateKey] = stateToCache
  cache.value.keys.push(stateKey)

  // 如果超出限制则移除最旧的
  if (cache.value.keys.length > MAX_CACHE_SIZE) {
    const oldestKey = cache.value.keys.shift()
    if (oldestKey) {
      delete cache.value.states[oldestKey]
    }
  }
}

/**
 * 从缓存获取状态
 */
export function getStateFromCache(stateKey: string): GenerationState | null {
  const state = cache.value.states[stateKey]
  
  if (state) {
    // 更新使用时间（将此key移到最后）
    const keyIndex = cache.value.keys.indexOf(stateKey)
    if (keyIndex !== -1) {
      cache.value.keys.splice(keyIndex, 1)
      cache.value.keys.push(stateKey)
    }
  }
  
  return state || null
}

/**
 * 清除缓存
 */
export function clearCache(): void {
  cache.value = {
    states: {},
    keys: []
  }
} 
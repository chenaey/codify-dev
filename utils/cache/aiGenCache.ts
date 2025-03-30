import type { SupportedLang } from '@/plugins/src'

import { useStorage } from '@vueuse/core'

interface AIGenResult {
  nodeId: string  // 节点ID，格式如 "444:2835"
  timestamp: number
  codeBlocks: Array<{
    name: string
    title: string
    code: string
    lang: SupportedLang
  }>
  status: 'pending' | 'completed'  // 生成状态
}

interface AIGenCache {
  results: AIGenResult[]
}

// 初始化本地存储
const cache = useStorage<AIGenCache>('tempad-ai-gen-cache', {
  results: []
})

const MAX_CACHE_SIZE = 5

export function initPendingResult(nodeId: string) {
  const newResult: AIGenResult = {
    nodeId,
    timestamp: Date.now(),
    codeBlocks: [{
      name: 'ai-generated',
      title: 'AI Generating...',
      lang: 'vue',
      code: ''
    }],
    status: 'pending'
  }

  const existingIndex = cache.value.results.findIndex(
    result => result.nodeId === nodeId
  )

  if (existingIndex !== -1) {
    // 如果已经存在且是完成状态，不要覆盖
    if (cache.value.results[existingIndex].status === 'completed') {
      return null
    }
    // 更新已存在的结果
    cache.value.results[existingIndex] = newResult
    return newResult
  } else {
    // 添加新结果，如果超出限制则移除最旧的
    cache.value.results.push(newResult)
    if (cache.value.results.length > MAX_CACHE_SIZE) {
      // 只考虑已完成的结果进行清理
      const completed = cache.value.results.filter(r => r.status === 'completed')
      const pending = cache.value.results.filter(r => r.status === 'pending')
      completed.sort((a, b) => b.timestamp - a.timestamp)
      cache.value.results = [...pending, ...completed.slice(0, MAX_CACHE_SIZE - pending.length)]
    }
    return newResult
  }
}

export function updateGenerationResult(nodeId: string, codeBlocks: AIGenResult['codeBlocks']) {
  const existingIndex = cache.value.results.findIndex(
    result => result.nodeId === nodeId
  )

  if (existingIndex !== -1) {
    // 更新已存在的结果
    cache.value.results[existingIndex] = {
      nodeId,
      timestamp: Date.now(),
      codeBlocks,
      status: 'completed'
    }
  }
}

export function getGenerationResult(nodeId: string): AIGenResult | null {
  return cache.value.results.find(result => result.nodeId === nodeId) || null
} 
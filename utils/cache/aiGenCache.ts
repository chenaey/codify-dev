import type { SupportedLang } from '@/plugins/src'

import { useStorage } from '@vueuse/core'
import type { CodeBlock } from '@/codegen/types'

interface AIGenResult {
  nodeId: string // 节点ID，格式如 "444:2835"
  projectId: string // 添加projectId字段
  timestamp: number
  codeBlocks: CodeBlock[]
  status: 'pending' | 'completed' // 生成状态
}

interface AIGenCache {
  results: AIGenResult[]
}

// 初始化本地存储
const cache = useStorage<AIGenCache>('tempad-ai-gen-cache', {
  results: []
})

const MAX_CACHE_SIZE = 5

// 生成缓存key
function getCacheKey(nodeId: string, projectId: string): string {
  return `${nodeId}:${projectId}`
}

export function initPendingResult(nodeId: string, projectId: string) {
  const newResult: AIGenResult = {
    nodeId,
    projectId,
    timestamp: Date.now(),
    codeBlocks: [
      {
        name: 'ai-generated',
        title: 'AI Generating...',
        lang: 'vue',
        code: ''
      }
    ],
    status: 'pending'
  }

  const existingIndex = cache.value.results.findIndex(
    (result) => getCacheKey(result.nodeId, result.projectId) === getCacheKey(nodeId, projectId)
  )

  if (existingIndex !== -1) {
    // 如果已经存在且是完成状态，不要覆盖
    if (cache.value.results[existingIndex].status === 'completed') {
      // 允许重复生成
      return newResult
    }
    // 更新已存在的结果
    cache.value.results[existingIndex] = newResult
    return newResult
  } else {
    // 添加新结果，如果超出限制则移除最旧的
    cache.value.results.push(newResult)
    if (cache.value.results.length > MAX_CACHE_SIZE) {
      // 只考虑已完成的结果进行清理
      const completed = cache.value.results.filter((r) => r.status === 'completed')
      const pending = cache.value.results.filter((r) => r.status === 'pending')
      completed.sort((a, b) => b.timestamp - a.timestamp)
      cache.value.results = [...pending, ...completed.slice(0, MAX_CACHE_SIZE - pending.length)]
    }
    return newResult
  }
}

export function updateGenerationResult(nodeId: string, projectId: string, codeBlocks: CodeBlock[]) {
  const existingIndex = cache.value.results.findIndex(
    (result) => getCacheKey(result.nodeId, result.projectId) === getCacheKey(nodeId, projectId)
  )

  if (existingIndex !== -1) {
    cache.value.results[existingIndex].codeBlocks = codeBlocks
    cache.value.results[existingIndex].status = 'completed'
  }
}

export function getGenerationResult(nodeId: string, projectId: string): AIGenResult | null {
  const result = cache.value.results.find(
    (result) => getCacheKey(result.nodeId, result.projectId) === getCacheKey(nodeId, projectId)
  )
  return result || null
}

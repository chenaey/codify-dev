import type { CodeBlock } from '@/codegen/types'
import type { SelectionNode } from '@/ui/state'

import { initPendingResult, updateGenerationResult, getGenerationResult } from '@/utils/cache/aiGenCache'
import { ref } from 'vue'

import type { GenerationState } from './useAICodeGeneration'

import { useLoadingAnimation } from './useLoadingAnimation'

export function useCodeCache() {
  const codeBlocks = ref<CodeBlock[]>([])

  // 处理已完成的缓存
  const handleCompletedCache = async (nodeId: string): Promise<boolean> => {
    const result = getGenerationResult(nodeId)
    if (result?.status === 'completed') {
      codeBlocks.value.unshift(...result.codeBlocks)
      return true
    }
    return false
  }

  // 处理待处理的缓存
  const handlePendingCache = async (
    nodeId: string,
    state: GenerationState,
    generateCode: (node: SelectionNode, aiCodeBlock: { value: CodeBlock }, updateCache: any) => Promise<boolean>
  ): Promise<boolean> => {
    const result = getGenerationResult(nodeId)
    if (result?.status === 'pending') {
      codeBlocks.value.unshift(...result.codeBlocks)
      const aiCodeBlock = ref(codeBlocks.value[0])
      
      const loading = useLoadingAnimation(aiCodeBlock)
      loading.start()
      state.loading = loading
      
      return await generateCode(
        { id: nodeId } as SelectionNode,
        aiCodeBlock,
        updateGenerationResult
      )
    }
    return false
  }

  // 初始化新的生成过程
  const initNewGeneration = async (
    nodeId: string,
    state: GenerationState,
    generateCode: (node: SelectionNode, aiCodeBlock: { value: CodeBlock }, updateCache: any) => Promise<boolean>
  ): Promise<boolean> => {
    const pendingResult = initPendingResult(nodeId)
    if (!pendingResult) {
      return await handleCompletedCache(nodeId)
    }
    
    codeBlocks.value.unshift(...pendingResult.codeBlocks)
    const aiCodeBlock = ref(codeBlocks.value[0])
    
    const loading = useLoadingAnimation(aiCodeBlock)
    loading.start()
    state.loading = loading
    
    return await generateCode(
      { id: nodeId } as SelectionNode,
      aiCodeBlock,
      updateGenerationResult
    )
  }

  // 检查并应用缓存
  const checkAndApplyCache = async (
    node: SelectionNode | null,
    state: GenerationState | undefined,
    generateCode: (node: SelectionNode, aiCodeBlock: { value: CodeBlock }, updateCache: any) => Promise<boolean>
  ) => {
    codeBlocks.value = codeBlocks.value.filter(block => block.name !== 'ai-generated')
    
    if (!node) return
    
    const nodeId = node.id
    const result = getGenerationResult(nodeId)
    
    if (result) {
      if (result.status === 'completed') {
        codeBlocks.value.unshift(...result.codeBlocks)
      } else if (result.status === 'pending' && state) {
        codeBlocks.value.unshift(...result.codeBlocks)
        const aiCodeBlock = ref(codeBlocks.value[0])
        
        aiCodeBlock.value.code = state.code
        
        if (state.status === 'pending' && state.promise) {
          const loading = useLoadingAnimation(aiCodeBlock)
          loading.start()
          state.loading = loading
          
          try {
            await state.promise
          } catch (err) {
            console.error('Generation failed:', err)
          }
        } else if (state.status === 'completed') {
          aiCodeBlock.value.title = 'AI Generated Code'
        }
      } else {
        const aiCodeBlock = ref(codeBlocks.value[0])
        aiCodeBlock.value.title = 'AI Generating...'
      }
    }
  }

  return {
    codeBlocks,
    handleCompletedCache,
    handlePendingCache,
    initNewGeneration,
    checkAndApplyCache
  }
} 
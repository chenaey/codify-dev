import type { CodeBlock } from '@/codegen/types'
import type { SelectionNode } from '@/ui/state'

import { useToast } from '@/composables/toast'
import { options } from '@/ui/state'
import { generateCode } from '@/utils/ai/client'
import { extractSelectedNodes } from '@/utils/uiExtractor'
import { ref, shallowRef } from 'vue'

export interface GenerationState {
  loading: { stop: () => void } | null
  controller: AbortController | null
  code: string
  status: 'init' | 'pending' | 'completed' | 'error'
  promise: Promise<boolean> | null
}

export function useAICodeGeneration() {
  const generatingStates = ref(new Map<string, GenerationState>())
  const aiError = ref('')
  const { show } = useToast()

  // 检查节点是否正在生成代码
  const isGeneratingAICode = (nodeId: string): boolean => {
    const state = generatingStates.value.get(nodeId)
    return state?.status === 'pending'
  }

  // 获取或初始化生成状态
  const getGenerationState = (nodeId: string): GenerationState => {
    if (!generatingStates.value.has(nodeId)) {
      generatingStates.value.set(nodeId, {
        loading: null,
        controller: null,
        code: '',
        status: 'init',
        promise: null
      })
    }
    return generatingStates.value.get(nodeId)!
  }

  // 清理生成状态
  const clearGenerationState = (nodeId: string) => {
    const state = generatingStates.value.get(nodeId)
    if (state) {
      state.loading?.stop()
      state.controller?.abort()
      // 不立即删除状态，而是保持状态直到下一次生成
      state.status = 'completed'
    }
  }

  // 生成代码的核心逻辑
  const generateAICodeForNode = async (
    node: SelectionNode,
    aiCodeBlock: { value: CodeBlock },
    updateCache: (nodeId: string, blocks: CodeBlock[]) => void
  ): Promise<boolean> => {
    const nodeId = node.id
    const state = getGenerationState(nodeId)
    const controller = new AbortController()
    state.controller = controller
    state.status = 'pending'

    try {
      const uiInfo = await extractSelectedNodes([node])

      for await (const chunk of generateCode(uiInfo, options.value.project)) {
        if (controller.signal.aborted) {
          state.status = 'completed'
          return false
        }
        aiCodeBlock.value.code += chunk
        state.code = aiCodeBlock.value.code
      }

      state.status = 'completed'
      state.loading?.stop()
      aiCodeBlock.value.title = 'AI Generated Code'

      updateCache(nodeId, [aiCodeBlock.value])
      show('AI Generated Code Success')
      return true
    } catch (err) {
      if (!controller.signal.aborted) {
        state.status = 'error'
        state.loading?.stop()
        throw err
      }
      return false
    }
  }

  // 清理所有状态
  const cleanup = () => {
    for (const [nodeId, state] of generatingStates.value) {
      state.loading?.stop()
      state.controller?.abort()
      state.status = 'completed'
    }
  }

  return {
    generatingStates,
    aiError,
    isGeneratingAICode,
    getGenerationState,
    clearGenerationState,
    generateAICodeForNode,
    cleanup
  }
}

import type { SelectionNode } from '@/ui/state'

import { ref, shallowRef, computed } from 'vue'
import { useToast } from '@/composables/toast'
import { 
  generateCode, 
  clearConversation, 
  sendUserMessage as sendMessage,
  createResponseGenerator 
} from '@/utils/ai/client'
import { extractSelectedNodes } from '@/utils/uiExtractor'
import { parseUIInfo } from '@/utils/uiParser'

// 定义生成状态类型
export interface GenerationState {
  code: string
  status: 'init' | 'pending' | 'completed' | 'error'
  controller: AbortController | null
  loadingDots?: string
  loadingTimer?: number
  resources?: Map<string, any>
}

export default function useAICodeGeneration() {
  const { show } = useToast()
  
  // AI代码状态管理
  const aiGenerationAbortController = shallowRef<AbortController | null>(null)
  const aiError = ref('')
  const currentNodeId = ref<string | null>(null)
  const currentProjectId = ref<string | null>(null)
  
  // 生成状态Map
  const generatingStates = ref(new Map<string, GenerationState>())
  
  // 创建计算属性来获取当前节点的生成状态
  const currentState = computed(() => {
    if (!currentNodeId.value || !currentProjectId.value) return null
    const stateKey = getStateKey(currentNodeId.value, currentProjectId.value)
    console.log('[currentState]', generatingStates.value.get(stateKey))
    return generatingStates.value.get(stateKey) || null
  })
  
  // 将componentAiCode改为计算属性
  const componentAiCode = computed(() => {
    return currentState.value?.code || ''
  })
  
  // 将aiCodeStatus改为计算属性
  const aiCodeStatus = computed(() => {
    return currentState.value?.status || 'init'
  })
  
  // 当前资源
  const currentResources = computed(() => {
    return currentState.value?.resources || new Map<string, any>()
  })
  
  // 当前加载状态的文本
  const loadingTitle = computed(() => {
    if (aiCodeStatus.value === 'completed') return 'AI Generated Code'
    if (aiCodeStatus.value === 'pending') return `Generating${currentState.value?.loadingDots || ''}`
    return 'AI Code Generation'
  })
  
  // 判断是否正在生成代码
  const isGenerating = computed(() => aiCodeStatus.value === 'pending')
  
  // 判断是否有生成完成的AI代码
  const hasGeneratedAiCode = computed(() => {
    return aiCodeStatus.value === 'completed' && !!componentAiCode.value
  })
  
  // 判断是否应该显示代码块
  const shouldShowCodeBlock = computed(() => {
    // 只要不是init状态，无论是pending、completed还是error都应该显示代码块
    return aiCodeStatus.value !== 'init'
  })

  // 获取状态Map的键
  function getStateKey(nodeId: string, projectId: string): string {
    return `${nodeId}:${projectId}`
  }

  // 清除Markdown语法标记
  function cleanMarkdownCode(code: string): string {
    return code
      .replace(/^```[a-zA-Z]*\n?/, '') // 去除开头的```和任意语言标记
      .replace(/```$/, '') // 去除结尾的```
      .trim() // 去除多余的空白字符
  }

  // 清除历史对话
  function clearChatHistory(nodeId: string, projectId: string) {
    clearConversation(nodeId, projectId)
  }
  
  // 启动加载动画
  function startLoadingAnimation(stateKey: string) {
    const state = generatingStates.value.get(stateKey)
    if (!state) return
    
    const dots = ['.', '..', '...', '....']
    let index = 0
    
    // 清除现有的timer
    if (state.loadingTimer) {
      window.clearInterval(state.loadingTimer)
    }
    
    // 设置新的timer
    state.loadingTimer = window.setInterval(() => {
      state.loadingDots = dots[index++ % dots.length]
    }, 300)
  }
  
  // 停止加载动画
  function stopLoadingAnimation(stateKey: string) {
    const state = generatingStates.value.get(stateKey)
    if (!state || !state.loadingTimer) return
    
    window.clearInterval(state.loadingTimer)
    state.loadingTimer = undefined
    state.loadingDots = ''
  }

  // 检查并恢复生成状态
  async function checkAndRestoreGeneration(node: SelectionNode | null, projectId: string) {
    // 更新当前节点和项目ID
    currentNodeId.value = node?.id || null
    currentProjectId.value = projectId
    
    if (!node) return
    
    const nodeId = node.id
    const stateKey = getStateKey(nodeId, projectId)
    
    // 检查是否有保存的状态
    const savedState = generatingStates.value.get(stateKey)
    
    if (savedState) {
      // 如果状态是pending，需要重新启动生成过程
      if (savedState.status === 'pending' && savedState.controller) {
        aiGenerationAbortController.value = savedState.controller
        // 重新启动加载动画
        startLoadingAnimation(stateKey)
      }
    } else {
      // 初始化一个空状态
      generatingStates.value.set(stateKey, {
        code: '',
        status: 'init',
        controller: null,
        resources: new Map<string, any>()
      })
    }
  }

  // 中止当前生成
  function abortGeneration() {
    if (aiGenerationAbortController.value) {
      aiGenerationAbortController.value.abort()
      aiGenerationAbortController.value = null
    }
    
    if (currentNodeId.value && currentProjectId.value) {
      const stateKey = getStateKey(currentNodeId.value, currentProjectId.value)
      const state = generatingStates.value.get(stateKey)
      if (state) {
        state.status = 'completed'
        stopLoadingAnimation(stateKey)
      }
    }
  }

  // 清理所有状态
  function cleanup() {
    abortGeneration()
    
    // 清理所有加载动画
    for (const [stateKey, state] of generatingStates.value.entries()) {
      if (state.loadingTimer) {
        window.clearInterval(state.loadingTimer)
      }
    }
    
    generatingStates.value.clear()
    currentNodeId.value = null
    currentProjectId.value = null
    aiError.value = ''
  }

  // 生成AI代码
  async function generateAICode(
    node: SelectionNode | null, 
    projectId: string, 
    supportedProjects: string[] = ['mvvm', 'vue3', 'cbg', 'ios', 'android']
  ) {
    if (!supportedProjects.includes(projectId)) {
      show('AI code generation is not supported in this project')
      return
    }
    
    if (!node) return
    
    // 更新当前节点和项目ID
    currentNodeId.value = node.id
    currentProjectId.value = projectId
    
    const nodeId = node.id
    const stateKey = getStateKey(nodeId, projectId)
    
    // 创建或获取状态
    if (!generatingStates.value.has(stateKey)) {
      generatingStates.value.set(stateKey, {
        code: '',
        status: 'init',
        controller: null,
        resources: new Map<string, any>()
      })
    }
    console.log('[generatingStates]', generatingStates.value)
    
    const state = generatingStates.value.get(stateKey)!
    
    // 如果正在生成，不允许重复点击
    if (state.status === 'pending') return
    
    // 清除错误信息
    aiError.value = ''
    
    try {
      // 标记为生成中状态
      state.status = 'pending'
      state.code = ''
      
      // 创建新的控制器
      const controller = new AbortController()
      state.controller = controller
      aiGenerationAbortController.value = controller
      
      // 启动加载动画
      startLoadingAnimation(stateKey)
      
      // 清除历史对话
      clearChatHistory(nodeId, projectId)
      
      // 获取选中节点的信息
      const { nodes: uiInfo, resources: newResources } = await extractSelectedNodes([node])
      
      // 立即保存资源到状态，使按钮能更早显示
      state.resources = newResources
      
      // 解析UI信息并开始生成代码
      const parsedInfo = parseUIInfo(uiInfo, projectId)
      
      // 使用生成器获取流式响应并实时更新
      for await (const chunk of generateCode(parsedInfo, projectId, nodeId)) {
        if (controller.signal.aborted) {
          return
        }
        state.code += chunk
      }
      
      // 清除代码块的Markdown语法标记
      state.code = cleanMarkdownCode(state.code)
      
      // 更新状态为完成
      state.status = 'completed'
      state.controller = null
      aiGenerationAbortController.value = null
      
      // 停止加载动画
      stopLoadingAnimation(stateKey)
      
      show('AI Generated Code Successfully')
      
      // 返回生成结果
      return { code: state.code, resources: state.resources }
    } catch (err) {
      if (aiGenerationAbortController.value?.signal.aborted) {
        return null
      }
      
      state.status = 'error'
      aiError.value = err instanceof Error ? err.message : 'Failed to generate AI code'
      console.error('Failed to generate AI code:', err)
      
      // 停止加载动画
      stopLoadingAnimation(stateKey)
      
      return null
    } finally {
      if (!aiGenerationAbortController.value?.signal.aborted) {
        aiGenerationAbortController.value = null
      }
    }
  }

  // 发送用户消息
  async function sendUserMessage(message: string, node: SelectionNode | null, projectId: string) {
    if (!node) return
    
    // 更新当前节点和项目ID
    currentNodeId.value = node.id
    currentProjectId.value = projectId
    
    const nodeId = node.id
    const stateKey = getStateKey(nodeId, projectId)
    
    // 获取或创建状态
    if (!generatingStates.value.has(stateKey)) {
      generatingStates.value.set(stateKey, {
        code: '',
        status: 'init',
        controller: null,
        resources: new Map<string, any>()
      })
    }
    
    const state = generatingStates.value.get(stateKey)!

    // 如果没有AI生成的代码，先生成
    if (!state.code) {
      await generateAICode(node, projectId)
      return
    }

    // 如果生成失败，直接返回
    if (!state.code) return

    // 清除当前代码内容，准备接收新内容
    state.code = ''
    state.status = 'pending'
    
    // 启动加载动画
    startLoadingAnimation(stateKey)

    try {
      // 获取选中节点的信息(仅用于首次使用)
      const { nodes: uiInfo } = await extractSelectedNodes([node])

      // 创建消息生成器
      const generator = createResponseGenerator(uiInfo, projectId, nodeId)

      // 定义更新函数
      const updateCode = (content: string) => {
        state.code = content
      }

      // 使用会话管理API发送用户消息
      await sendMessage(nodeId, projectId, message, uiInfo, generator, updateCode)

      // 清除代码块的Markdown语法标记
      state.code = cleanMarkdownCode(state.code)
      state.status = 'completed'
      
      // 停止加载动画
      stopLoadingAnimation(stateKey)

      show('Code updated')
      return state.code
    } catch (error: any) {
      console.error('Generation failed:', error)
      aiError.value = 'Generation failed: ' + (error.message || 'Unknown error')
      state.status = 'error'
      
      // 停止加载动画
      stopLoadingAnimation(stateKey)
      
      return null
    }
  }

  return {
    // 状态
    componentAiCode,
    aiCodeStatus,
    aiError,
    isGenerating,
    hasGeneratedAiCode,
    loadingTitle,
    currentResources,
    shouldShowCodeBlock,
    
    // 方法
    generateAICode,
    sendUserMessage,
    checkAndRestoreGeneration,
    clearChatHistory,
    abortGeneration,
    cleanup
  }
} 
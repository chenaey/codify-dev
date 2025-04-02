<script setup lang="ts">
import type { CodeBlock } from '@/codegen/types'
import type { SelectionNode } from '@/ui/state'

import AIChatInput from '@/components/AIChatInput.vue'
import Badge from '@/components/Badge.vue'
import Code from '@/components/Code.vue'
import IconButton from '@/components/IconButton.vue'
import Info from '@/components/icons/Info.vue'
import Preview from '@/components/icons/Preview.vue'
import Section from '@/components/Section.vue'
import { useToast } from '@/composables/toast'
import { selection, selectedNode, options, selectedTemPadComponent, activePlugin } from '@/ui/state'
import { getDesignComponent } from '@/utils'
import { 
  generateCode, 
  clearConversation, 
  sendUserMessage as sendMessage,
  createResponseGenerator
} from '@/utils/ai/client'
import {
  initPendingResult,
  updateGenerationResult,
  getGenerationResult
} from '@/utils/cache/aiGenCache'
import { extractSelectedNodes } from '@/utils/uiExtractor'
import { parseUIInfo } from '@/utils/uiParser'
import { ref, computed, shallowRef, watch, onUnmounted, nextTick } from 'vue'

interface GenerationState {
  loading: { stop: () => void } | null
  controller: AbortController | null
  code: string
  status: 'pending' | 'completed' | 'error'
  promise: Promise<boolean> | null
}

const componentCode = shallowRef('')
const componentLink = shallowRef('')
const codeBlocks = ref<CodeBlock[]>([])
const warning = shallowRef('')
const aiError = ref('')
const { show } = useToast()

// 使用 Map 来跟踪每个节点的生成状态
const generatingStates = ref(new Map<string, GenerationState>())

const playButtonTitle = computed(() =>
  componentLink.value
    ? 'Open in TemPad Playground'
    : 'The component is produced with older versions of TemPad that does not provide a link to TemPad playground.'
)

// 生成状态key
function getStateKey(nodeId: string, projectId: string): string {
  return `${nodeId}:${projectId}`
}

// 辅助函数：检查节点是否正在生成代码
function isGeneratingAICode(nodeId: string): boolean {
  const projectId = options.value.project
  return generatingStates.value.has(getStateKey(nodeId, projectId))
}

// 辅助函数：初始化或获取生成状态
function getGenerationState(nodeId: string): GenerationState {
  const projectId = options.value.project
  const stateKey = getStateKey(nodeId, projectId)
  if (!generatingStates.value.has(stateKey)) {
    generatingStates.value.set(stateKey, {
      loading: null,
      controller: null,
      code: '',
      status: 'pending',
      promise: null
    })
  }
  return generatingStates.value.get(stateKey)!
}

// 辅助函数：清理生成状态
function clearGenerationState(nodeId: string) {
  const projectId = options.value.project
  const stateKey = getStateKey(nodeId, projectId)
  const state = generatingStates.value.get(stateKey)
  if (state) {
    state.loading?.stop()
    state.controller?.abort()
    state.status = 'completed'
    generatingStates.value.delete(stateKey)
  }
}

// 生成加载动画点
function useLoadingTitle(aiCodeBlock: Ref<CodeBlock>) {
  const dots = ['.', '..', '...', '....']
  let index = 0
  let timer: number | null = null

  // 开始动画
  function start() {
    timer = window.setInterval(() => {
      aiCodeBlock.value.title = 'AI Generating' + dots[index++ % dots.length]
    }, 300)
  }

  // 停止动画
  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return { start, stop }
}

async function updateCode() {
  const node = selectedNode.value

  if (node == null || selection.value.length > 1) {
    codeBlocks.value = []
    return
  }

  const tempadComponent = selectedTemPadComponent.value
  componentCode.value = tempadComponent?.code || ''
  componentLink.value = tempadComponent?.link || ''

  const component = getDesignComponent(node)

  const style = await node.getCSSAsync()
  const { cssUnit, project, rootFontSize, scale } = options.value
  const serializeOptions = {
    useRem: cssUnit === 'rem',
    rootFontSize,
    scale,
    project
  }

  codeBlocks.value = (
    await codegen(style, component, serializeOptions, activePlugin.value?.code || undefined)
  ).codeBlocks
  if ('warning' in node) {
    warning.value = node.warning
  } else {
    warning.value = ''
  }
}

// 辅助函数：清除代码块的Markdown语法标记
function cleanMarkdownCode(code: string): string {
  return code
    .replace(/^```[a-zA-Z]*\n?/, '') // 去除开头的```和任意语言标记
    .replace(/```$/, '') // 去除结尾的```
    .trim() // 去除多余的空白字符
}

// 检查并应用缓存的代码块
async function checkAndApplyCache(node: SelectionNode | null) {
  // 清除现有的 AI 生成代码块
  codeBlocks.value = codeBlocks.value.filter((block) => block.name !== 'ai-generated')

  if (!node) return

  const nodeId = node.id
  const projectId = options.value.project
  const result = getGenerationResult(nodeId, projectId)
  const state = generatingStates.value.get(getStateKey(nodeId, projectId))
  if (result) {
    if (result.status === 'completed') {
      // 使用已完成的缓存结果
      result.codeBlocks.forEach((block) => {
        block.code = cleanMarkdownCode(block.code)
        block.title = 'AI Generated Cache'
      })
      codeBlocks.value.unshift(...result.codeBlocks)
    } else if (result.status === 'pending') {
      // 显示待处理状态
      codeBlocks.value.unshift(...result.codeBlocks)
      const aiCodeBlock = ref(codeBlocks.value[0])

      // 如果存在生成状态，说明请求可能还在进行中
      if (state) {
        // 更新代码内容
        aiCodeBlock.value.code = state.code

        // 根据请求状态处理
        if (state.status === 'pending' && state.promise) {
          // 请求还在进行中，启动新的loading
          const loading = useLoadingTitle(aiCodeBlock)
          loading.start()
          state.loading = loading

          // 等待请求完成
          try {
            await state.promise
          } catch (err) {
            console.error('Generation failed:', err)
          }
        } else if (state.status === 'completed') {
          // 请求已完成，更新标题
          aiCodeBlock.value.title = 'AI Generated Code'
        }
      } else {
        // 否则只显示生成中的标题
        aiCodeBlock.value.title = 'AI Generating...'
      }
    }
  }
}

// 处理已完成的缓存结果
async function handleCompletedCache(nodeId: string) {
  const projectId = options.value.project
  const result = getGenerationResult(nodeId, projectId)
  if (result?.status === 'completed') {
    // 清理每个代码块中的Markdown标记
    result.codeBlocks.forEach((block) => {
      block.code = cleanMarkdownCode(block.code)
    })
    codeBlocks.value.unshift(...result.codeBlocks)
    show('Using cached AI generated code')
    return true
  }
  return false
}

// 处理待处理的缓存结果
async function handlePendingCache(nodeId: string) {
  const projectId = options.value.project
  const result = getGenerationResult(nodeId, projectId)
  if (result?.status === 'pending') {
    // 继续显示正在生成的状态
    codeBlocks.value.unshift(...result.codeBlocks)
    const aiCodeBlock = ref(codeBlocks.value[0])

    const state = getGenerationState(nodeId)
    const controller = new AbortController()
    state.controller = controller

    const loading = useLoadingTitle(aiCodeBlock)
    loading.start()
    state.loading = loading

    // 创建并保存生成Promise
    state.promise = (async () => {
      try {
        // 获取选中节点的信息并继续生成
        const uiInfo = await extractSelectedNodes([selectedNode.value])

        // 使用生成器获取流式响应并实时更新
        for await (const chunk of generateCode(uiInfo, options.value.project, nodeId)) {
          if (controller.signal.aborted) {
            return false
          }
          aiCodeBlock.value.code += chunk
          state.code = aiCodeBlock.value.code
        }

        // 更新状态为完成
        state.status = 'completed'
        clearGenerationState(nodeId)
        aiCodeBlock.value.title = 'AI Generated Code'

        // 更新缓存为完成状态
        updateGenerationResult(nodeId, projectId, [aiCodeBlock.value])

        // 清除代码块的Markdown语法标记
        aiCodeBlock.value.code = cleanMarkdownCode(aiCodeBlock.value.code)

        show('AI Generated Code Success')
        return true
      } catch (err) {
        if (!controller.signal.aborted) {
          state.status = 'error'
          clearGenerationState(nodeId)
          throw err
        }
        return false
      }
    })()

    return state.promise
  }
  return false
}

// 初始化新的生成过程
async function initNewGeneration(nodeId: string) {
  const projectId = options.value.project
  const pendingResult = initPendingResult(nodeId, projectId)
  if (!pendingResult) {
    // 如果返回 null，说明已经有完成的结果，再次检查
    return await handleCompletedCache(nodeId)
  }
  clearChatHistory()
  // 将待生成的代码块添加到列表开头
  codeBlocks.value.unshift(...pendingResult.codeBlocks)
  const aiCodeBlock = ref(codeBlocks.value[0])

  const state = getGenerationState(nodeId)
  const controller = new AbortController()
  state.controller = controller

  // 启动加载动画
  const loading = useLoadingTitle(aiCodeBlock)
  loading.start()
  state.loading = loading

  // 创建并保存生成Promise
  state.promise = (async () => {
    try {
      // 获取选中节点的信息
      const uiInfo = await extractSelectedNodes([selectedNode.value])
      const parsedInfo = parseUIInfo(uiInfo, options.value.project)
      console.log(parsedInfo, 'parsedInfo')
      // 使用生成器获取流式响应并实时更新
      for await (const chunk of generateCode(parsedInfo, options.value.project, nodeId)) {
        if (controller.signal.aborted) {
          return false
        }
        aiCodeBlock.value.code += chunk
        state.code = aiCodeBlock.value.code
      }
      aiCodeBlock.value.code.replace(/```vue/, '')

      // 更新状态为完成
      state.status = 'completed'
      clearGenerationState(nodeId)
      aiCodeBlock.value.title = 'AI Generated Code'

      // 更新缓存为完成状态
      updateGenerationResult(nodeId, projectId, [aiCodeBlock.value])

      // 清除代码块的Markdown语法标记
      aiCodeBlock.value.code = cleanMarkdownCode(aiCodeBlock.value.code)

      show('AI Generated Code Success')
      return true
    } catch (err) {
      if (!controller.signal.aborted) {
        state.status = 'error'
        clearGenerationState(nodeId)
        throw err
      }
      return false
    }
  })()

  return state.promise
}

const supportProject = ['mvvm', 'cbg', 'ios', 'android']
async function generateAICode() {
  if (!supportProject.includes(options.value.project)) {
    show('AI code generation is not supported in this project')
    return
  }
  if (!selectedNode.value) return

  const nodeId = selectedNode.value.id
  if (isGeneratingAICode(nodeId)) return

  aiError.value = ''

  try {
    // 移除已存在的 AI 生成代码块（如果有）
    codeBlocks.value = codeBlocks.value.filter((block) => block.name !== 'ai-generated')

    // // 1. 检查是否有已完成的缓存
    // if (await handleCompletedCache(nodeId)) return

    // 2. 检查是否有待处理的缓存
    if (await handlePendingCache(nodeId)) return

    // 3. 开始新的生成过程
    await initNewGeneration(nodeId)
  } catch (err) {
    aiError.value = err instanceof Error ? err.message : 'Failed to generate AI code'
    console.error('Failed to generate AI code:', err)
    // 如果发生错误，移除正在生成的代码块
    codeBlocks.value = codeBlocks.value.filter((block) => block.name !== 'ai-generated')
  }
}

watch([selectedNode, activePlugin], async ([node]) => {
  await updateCode()
  // 在更新完基础代码后，检查 AI 生成缓存
  await checkAndApplyCache(node)
})

watch(options, updateCode, {
  deep: true
})

// 监听project变化，清理相关状态
watch(
  () => options.value.project,
  () => {
    // 清理所有生成状态
    for (const [stateKey] of generatingStates.value) {
      const state = generatingStates.value.get(stateKey)
      if (state) {
        state.loading?.stop()
        state.controller?.abort()
      }
    }
    generatingStates.value.clear()

    // 清理当前显示的AI生成代码
    codeBlocks.value = codeBlocks.value.filter((block) => block.name !== 'ai-generated')

    // 如果有选中节点，重新检查新project的缓存
    if (selectedNode.value) {
      checkAndApplyCache(selectedNode.value)
    }
  }
)

function open() {
  window.open(componentLink.value)
}

// 组件卸载时清理所有状态
onUnmounted(() => {
  for (const [stateKey] of generatingStates.value) {
    const state = generatingStates.value.get(stateKey)
    if (state) {
      state.loading?.stop()
      state.controller?.abort()
    }
  }
  generatingStates.value.clear()
})

// 处理用户发送消息的函数
async function sendUserMessage(message: string) {
  if (!selectedNode.value) return

  const nodeId = selectedNode.value.id
  const projectId = options.value.project

  // 如果没有AI生成的代码，先生成
  if (!codeBlocks.value.some((block) => block.name === 'ai-generated')) {
    await generateAICode()
    await nextTick()
  }

  const aiCodeBlock = codeBlocks.value.find((block) => block.name === 'ai-generated')
  if (!aiCodeBlock) return

  // 清除当前代码内容，准备接收新内容
  aiCodeBlock.code = ''
  aiCodeBlock.title = 'AI Generating...'

  try {
    // 获取选中节点的信息(仅用于首次使用)
    const uiInfo = await extractSelectedNodes([selectedNode.value])

    // 创建消息生成器
    const generator = createResponseGenerator(uiInfo, projectId, nodeId)
    
    // 定义更新函数
    const updateCode = (content: string) => {
      aiCodeBlock.code = content
    }

    // 使用会话管理API发送用户消息
    await sendMessage(nodeId, projectId, message, uiInfo, generator, updateCode)

    // 清除代码块的Markdown语法标记
    aiCodeBlock.code = cleanMarkdownCode(aiCodeBlock.code)
    aiCodeBlock.title = 'AI Updated Code'

    show('Code updated')
  } catch (error: any) {
    console.error('生成失败:', error)
    aiError.value = '生成失败: ' + (error.message || '未知错误')
  }
}

// 清除历史对话
function clearChatHistory() {
  if (!selectedNode.value) return
  clearConversation(selectedNode.value.id, options.value.project)
}

// 检查是否有AI生成的代码块且生成成功
const showAIChatInput = computed(() => {
  if (!selectedNode.value) return false
  
  // 检查是否有AI生成的代码块
  const hasGeneratedCode = codeBlocks.value.some(block => 
    block.name === 'ai-generated' && 
    (block.title === 'AI Generated Code' || block.title === 'AI Updated Code' || block.title === 'AI Generated Cache')
  )
  
  return hasGeneratedCode
})
</script>

<template>
  <Section :collapsed="!selectedNode || !(componentCode || codeBlocks.length)">
    <template #header>
      <div class="tp-code-header tp-row tp-shrink tp-gap-l">
        Code
        <Badge v-if="activePlugin" title="Code in this section is transformed by this plugin">{{
          activePlugin.name
        }}</Badge>
        <IconButton
          variant="secondary"
          title="AI Generate Code (beta)"
          :disabled="(selectedNode && isGeneratingAICode(selectedNode.id)) || !selectedNode"
          @click="generateAICode"
        >
          AI
        </IconButton>
      </div>
      <IconButton v-if="warning" variant="secondary" :title="warning" dull>
        <Info />
      </IconButton>
    </template>

    <div v-if="aiError" class="error">
      {{ aiError }}
    </div>
    <!-- 在最后添加聊天输入框，只在生成成功后显示 -->
    <AIChatInput
      v-if="showAIChatInput"
      :disabled="!selectedNode"
      :loading="selectedNode && isGeneratingAICode(selectedNode.id)"
      @send="sendUserMessage"
      @clear="clearChatHistory"
    />

    <Code
      v-if="componentCode"
      class="tp-code-code"
      title="Component"
      lang="js"
      :link="componentLink"
      :code="componentCode"
    >
      <template #actions>
        <IconButton
          :disabled="!componentLink"
          variant="secondary"
          :title="playButtonTitle"
          @click="open"
        >
          <Preview />
        </IconButton>
      </template>
    </Code>
    <Code
      v-for="{ name, title, lang, code } in codeBlocks"
      :key="name"
      class="tp-code-code"
      :title="title"
      :lang="lang"
      :code="code"
    />
  </Section>
</template>

<style scoped>
[data-fpl-version='ui2'] .tp-code-header {
  gap: var(--spacer-l, 8px);
}

.tp-code-code {
  margin-bottom: 8px;
}

.error {
  color: var(--color-error);
  margin-bottom: 8px;
}
</style>

<script setup lang="ts">
import type { CodeBlock } from '@/types/codegen'

import AIChatInput from '@/components/AIChatInput.vue'
import Badge from '@/components/Badge.vue'
import Code from '@/components/Code.vue'
import IconButton from '@/components/IconButton.vue'
import Info from '@/components/icons/Info.vue'
import Preview from '@/components/icons/Preview.vue'
import Section from '@/components/Section.vue'
import { useToast } from '@/composables'
import useAICodeGeneration from '@/composables/useAICodeGeneration'
import { selection, selectedNode, options, selectedTemPadComponent, activePlugin } from '@/ui/state'
import { getDesignComponent } from '@/utils'
import { prepareConversation } from '@/utils/ai/conversation'
import { codegen } from '@/utils/codegen'
import { getCSSAsync } from '@/utils/css'
import { downloadIconResources } from '@/utils/download'
import { extractSelectedNodes } from '@/utils/uiExtractor'
import { parseUIInfo } from '@/utils/uiParser'
import { useClipboard } from '@vueuse/core'
import { ref, computed, shallowRef, watch, onUnmounted, nextTick, unref } from 'vue'

import Button from '../Button.vue'
import Copy from '../icons/Copy.vue'
// import PreviewSection from './PreviewSection.vue'

// 导入复制功能和提示功能
const { copy } = useClipboard()
const { show } = useToast()

// 导入AI代码生成相关hook
const {
  componentAiCode,
  aiCodeStatus,
  aiError,
  isGenerating,
  hasGeneratedAiCode,
  loadingTitle,
  currentResources,
  shouldShowCodeBlock,
  generatingStates,
  getStateKey,
  generateAICode: generateAI,
  sendUserMessage,
  clearChatHistory,
  cleanup: cleanupAI
} = useAICodeGeneration()

const componentCode = shallowRef('')
const componentLink = shallowRef('')
const codeBlocks = ref<CodeBlock[]>([])
const warning = shallowRef('')
const isDownloading = ref(false)

// 新增提示词复制状态
const isCopyingPrompt = ref(false)
const copyPromptSuccess = ref(false)

const playButtonTitle = computed(() =>
  componentLink.value
    ? 'Open in TemPad Playground'
    : 'The component is produced with older versions of TemPad that does not provide a link to TemPad playground.'
)

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
  const style = await getCSSAsync(node)
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

// 生成AI代码的方法
async function generateAICode() {
  if (!selectedNode.value) return
  
  await generateAI(selectedNode.value, options.value.project)
}

// 发送用户消息
async function handleSendMessage(message: string) {
  if (!selectedNode.value) return
  
  await sendUserMessage(message, selectedNode.value, options.value.project)
}

// 清除历史对话
function handleClearChatHistory() {
  if (!selectedNode.value) return
  clearChatHistory(selectedNode.value.id, options.value.project)
}

// 实现复制提示词功能
async function copyPrompt() {
  if (!selectedNode.value) return
  
  try {
    isCopyingPrompt.value = true
    
    // 获取选中节点的信息（包括资源）
    const { nodes: uiInfo, resources: newResources } = await extractSelectedNodes([selectedNode.value])
    
    // 解析UI信息
    const parsedInfo = parseUIInfo(uiInfo, options.value.project)
    
    // 准备对话消息（提示词）
    const nodeId = selectedNode.value.id
    const projectId = options.value.project
    const messages = prepareConversation(nodeId, projectId, parsedInfo)
    
    // 将提示词格式化为可读的文本
    const promptText = messages[1].content
    
    // 复制到剪贴板
    await copy(promptText)
    
    // 更新当前资源状态（这样下载按钮就会显示）
    if (newResources && newResources.size > 0) {
      // 获取当前状态并更新资源
      const stateKey = getStateKey(nodeId, projectId)
      const currentState = generatingStates.value.get(stateKey)
      if (currentState) {
        currentState.resources = newResources
      } else {
        // 如果没有状态，创建一个新的
        generatingStates.value.set(stateKey, {
          code: '',
          status: 'init',
          controller: null,
          resources: newResources
        })
      }
    }
    
    // 显示复制成功提示
    show('Successfully copied to clipboard')
  } catch (error) {
    console.error('复制提示词失败:', error)
  } finally {
    isCopyingPrompt.value = false
  }
}

watch([selectedNode, activePlugin], async ([node]) => {
  await updateCode()
  // 在更新完基础代码后，检查AI生成状态
})

watch(options, updateCode, {
  deep: true
})

function open() {
  window.open(componentLink.value)
}

// 组件卸载时清理所有状态
onUnmounted(() => {
  console.log('[onUnmounted]')
  cleanupAI()
})

// 处理图标下载
async function handleDownloadIcons() {
  const resources = unref(currentResources)
  if (!resources?.size) return

  isDownloading.value = true
  try {
    const filename = `${selectedNode.value?.name || 'icons'}-export.zip`
    await downloadIconResources(resources, filename)
  } finally {
    isDownloading.value = false
  }
}

// 添加控制弹窗显示的状态
const showPreview = ref(false)

// 修改打开预览的方法
const openPreview = () => {
  if (shouldShowCodeBlock && componentAiCode.value) {
    showPreview.value = true
    // 锁定body滚动
    document.body.style.overflow = 'hidden'
  }
}

// 关闭预览的方法
const closePreview = () => {
  showPreview.value = false
  // 恢复body滚动
  document.body.style.overflow = ''
}
</script>

<template>
  <Section :collapsed="!selectedNode || !(componentCode || shouldShowCodeBlock || codeBlocks.length)">
    <template #header>
      <div class="tp-code-header tp-row tp-shrink tp-gap-l code-section-header">
        Code
        <Badge v-if="activePlugin" title="Code in this section is transformed by this plugin">{{
          activePlugin.name
        }}</Badge>

        <IconButton
          variant="secondary"
          title="Copy Prompt" 
          style="width: auto;white-space: nowrap;padding: 0 6px;"
          :disabled="isCopyingPrompt"
          @click="copyPrompt"
        >
          Copy Prompt
        </IconButton>
        <IconButton
          variant="secondary"
          title="AI Generate Code (beta)"
          :disabled="isGenerating || !selectedNode"
          @click="generateAICode"
        >
          AI
        </IconButton>
        <div class="tp-code-actions tp-row tp-gap-s">
          <!-- <button
            v-if="aiCodeStatus === 'completed'"
            :style="{
              'margin-right': '8px'
            }"
            class="tp-button tp-button-primary"
            @click="openPreview"
          >
            Preview
          </button> -->
          <!-- 添加图标下载按钮 -->
          <Button
            v-if="unref(currentResources)?.size && selectedNode"
            class="tp-icon-download-btn"
            @click="handleDownloadIcons"
            :disabled="isDownloading"
          >
            {{ isDownloading ? 'Exporting...' : `Export ${unref(currentResources)?.size} icons` }}
          </Button>
        </div>
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
      v-if="hasGeneratedAiCode"
      :disabled="!selectedNode"
      :loading="isGenerating"
      @send="handleSendMessage"
      @clear="handleClearChatHistory"
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
    
    <!-- 显示AI生成的代码 -->
    <Code
      v-if="shouldShowCodeBlock"
      class="tp-code-code"
      :title="loadingTitle"
      lang="vue"
      :code="componentAiCode"
    />
    
    <!-- 显示其他代码块 -->
    <Code
      v-for="{ name, title, lang, code } in codeBlocks"
      :key="name"
      class="tp-code-code"
      :title="title"
      :lang="lang"
      :code="code"
    />

    <!-- 添加弹窗组件 -->
    <!-- <Modal :show="showPreview" @close="closePreview">
      <PreviewSection :code="componentAiCode" :resources="unref(currentResources)" />
    </Modal> -->
  </Section>
</template>

<style scoped>
[data-fpl-version='ui2'] .tp-code-header {
  gap: var(--spacer-l, 8px);
}

.code-section-header {
  padding-bottom: 8px;
}

.tp-code-code {
  margin-bottom: 8px;
}

.error {
  color: var(--color-error);
  margin-bottom: 8px;
}

.tp-icon-download-btn {
  --btn-height: 2rem;
  --btn-padding: 0 0.75rem;
  border-radius: 0.375rem;
  font-weight: var(--text-body-medium-strong-font-weight, 600);
  letter-spacing: var(--text-body-medium-strong-letter-spacing);
  background: var(--color-primary);
  color: var(--color-white, #fff);
}

.tp-icon-download-btn:hover {
  background: var(--color-primary-hover);
}

.tp-icon-download-btn:disabled {
  background: var(--color-primary-disabled);
  cursor: not-allowed;
}

.playground-overlay,
.playground-container,
.playground-header,
.close-btn {
  display: none;
}
</style>

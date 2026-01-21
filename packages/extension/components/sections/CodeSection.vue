<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { ref, computed, shallowRef, watch, onUnmounted, unref } from 'vue'

import type { CodeBlock } from '@/types/codegen'

import AIChatInput from '@/components/AIChatInput.vue'
import Badge from '@/components/Badge.vue'
import Code from '@/components/Code.vue'
import IconButton from '@/components/IconButton.vue'
import Preview from '@/components/icons/Preview.vue'
import Section from '@/components/Section.vue'
import { useToast } from '@/composables'
import useAICodeGeneration from '@/composables/useAICodeGeneration'
import { selection, selectedNode, options, selectedTemPadComponent, activePlugin } from '@/ui/state'
import { generateCodeBlocksForNode } from '@/utils'
import { prepareConversation } from '@/utils/ai/conversation'
import { downloadIconResources } from '@/utils/download'
import { getSVGCodeAsync } from '@/utils/iconExtractor'
import { extractSelectedNodes } from '@/utils/uiExtractor'
import { parseUIInfo } from '@/utils/uiParser'

import Button from '../Button.vue'

// 导入复制功能和提示功能
const { copy } = useClipboard()
const { show } = useToast()

// 导入AI代码生成相关hook
const {
  componentAiCode,
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
const codeBlocks = shallowRef<CodeBlock[]>([])
const svgCode = shallowRef('')
const isDownloading = ref(false)

// 新增提示词复制状态
const isCopyingPrompt = ref(false)

const textContent = computed(() => {
  const node = selectedNode.value
  if (node && node.type === 'TEXT' && 'characters' in node) {
    return (node as unknown as { characters: string }).characters
  }
  return ''
})

const playButtonTitle = computed(() =>
  componentLink.value
    ? 'Open in TemPad Playground'
    : 'The component is produced with older versions of TemPad that does not provide a link to TemPad playground.'
)

async function updateCode() {
  const node = selectedNode.value
  if (node == null || selection.value.length > 1) {
    codeBlocks.value = []
    svgCode.value = ''
    return
  }

  const tempadComponent = selectedTemPadComponent.value
  componentCode.value = tempadComponent?.code || ''
  componentLink.value = tempadComponent?.link || ''

  // 处理 SVG 代码生成
  svgCode.value = await getSVGCodeAsync(node)

  const result = await generateCodeBlocksForNode(
    node,
    {
      cssUnit: options.value.cssUnit,
      rootFontSize: options.value.rootFontSize,
      scale: options.value.scale,
      project: options.value.project
    },
    activePlugin.value?.code || undefined
  )
  codeBlocks.value = result.codeBlocks
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
    const { nodes: uiInfo, resources: newResources } = await extractSelectedNodes([
      selectedNode.value
    ])

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

watch([selectedNode, activePlugin], async () => {
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
</script>

<template>
  <Section
    :collapsed="
      !selectedNode ||
      !(componentCode || shouldShowCodeBlock || codeBlocks.length || svgCode || textContent)
    "
  >
    <template #header>
      <div class="tp-code-header tp-row tp-shrink tp-gap-l code-section-header">
        Code
        <Badge v-if="activePlugin" title="Code in this section is transformed by this plugin">{{
          activePlugin.name
        }}</Badge>

        <IconButton
          variant="secondary"
          title="Copy Prompt"
          style="width: auto; white-space: nowrap; padding: 0 6px"
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
    <!-- 显示 SVG 代码 -->
    <Code
      v-if="svgCode"
      class="tp-code-code tp-code-svg"
      title="SVG Code"
      lang="svg"
      :code="svgCode"
    />

    <!-- 显示文本内容 -->
    <Code
      v-if="textContent"
      class="tp-code-code tp-code-text"
      title="Content"
      lang="text"
      :code="textContent"
    />
  </Section>
</template>

<style scoped>
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

.tp-code-text :deep(.tp-code-content) {
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--ramp-black-800);
}

.tp-code-svg :deep(.tp-code-content) {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

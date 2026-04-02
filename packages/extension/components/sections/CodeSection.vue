<script setup lang="ts">
import { useClipboard, useDebounceFn } from '@vueuse/core'
import { ref, computed, shallowRef, watch, onUnmounted, unref } from 'vue'

import type { CodeBlock } from '@/types/codegen'

import AIChatInput from '@/components/AIChatInput.vue'
import Badge from '@/components/Badge.vue'
import Code from '@/components/Code.vue'
import IconButton from '@/components/IconButton.vue'
import Preview from '@/components/icons/Preview.vue'
import Section from '@/components/Section.vue'
import { useSkill, useToast } from '@/composables'
import useAICodeGeneration from '@/composables/useAICodeGeneration'
import { sendPreload } from '@/skill'
import { selection, selectedNode, options, selectedTemPadComponent, activePlugin } from '@/ui/state'
import { generateCodeBlocksForNode } from '@/utils'
import { prepareConversation } from '@/utils/ai/conversation'
import { downloadIconResources } from '@/utils/download'
import { getSVGCodeAsync } from '@/utils/iconExtractor'
import { track } from '@/utils/tracker'
import { extractSelectedNodes } from '@/utils/uiExtractor'
import { parseUIInfo } from '@/utils/uiParser'

import Button from '../Button.vue'

// 导入复制功能和提示功能
const { copy } = useClipboard()
const { show } = useToast()
const { selfId } = useSkill()

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
const isCopyingSkill = ref(false)

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

// 🚀 CSS 缓存：避免重复计算同一节点的 CSS
const cssCache = new Map<string, { codeBlocks: CodeBlock[]; svgCode: string }>()

// 生成缓存键：节点ID + 配置指纹
function getCacheKey(nodeId: string): string {
  const { cssUnit, rootFontSize, scale, project } = options.value
  const pluginId = activePlugin.value?.name || 'none'
  return `${nodeId}:${cssUnit}:${rootFontSize}:${scale}:${project}:${pluginId}`
}

// 标记当前是否正在更新（用于取消过时的请求）
let updateVersion = 0

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

  // 🚀 检查缓存
  const cacheKey = getCacheKey(node.id)
  const cached = cssCache.get(cacheKey)
  if (cached) {
    codeBlocks.value = cached.codeBlocks
    svgCode.value = cached.svgCode
    return
  }

  // 记录当前版本，用于检测过时请求
  const currentVersion = ++updateVersion

  // 处理 SVG 代码生成
  const newSvgCode = await getSVGCodeAsync(node)

  // 检查是否已过时（用户已选择其他节点）
  if (currentVersion !== updateVersion) return

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

  // 再次检查是否过时
  if (currentVersion !== updateVersion) return

  // 更新结果
  codeBlocks.value = result.codeBlocks
  svgCode.value = newSvgCode

  // 🚀 缓存结果（限制缓存大小）
  if (cssCache.size > 10) {
    // 删除最早的缓存
    const firstKey = cssCache.keys().next().value
    if (firstKey) cssCache.delete(firstKey)
  }
  cssCache.set(cacheKey, { codeBlocks: result.codeBlocks, svgCode: newSvgCode })
}

// 生成AI代码的方法
async function generateAICode() {
  if (!selectedNode.value) return
  track('generate_ai_code')
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
    track('copy_prompt')
  }
}

function getFileKey(): string {
  const match = window.location.pathname.match(/\/(?:file|design)\/([^/?#]+)/)
  return match?.[1] ?? ''
}

// 复制 Skill Prompt 功能
async function copySkill() {
  if (!selectedNode.value) return

  try {
    isCopyingSkill.value = true

    const nodeId = selectedNode.value.id
    const fileKey = getFileKey()
    const promptText = `codify-design-to-code skill file_key: ${fileKey} node_id: ${nodeId}`

    // 复制到剪贴板
    await copy(promptText)
    show('Skill prompt copied!')

    // 触发缓存预热（通过 WebSocket 通道）
    if (fileKey && nodeId) {
      sendPreload(fileKey, nodeId)
    }
  } catch (error) {
    console.error('Failed to copy skill prompt:', error)
    show('Failed to copy skill prompt')
  } finally {
    isCopyingSkill.value = false
    track('copy_skill')
  }
}

// 🚀 使用防抖优化：避免快速连续点击导致的重复计算
// 100ms 延迟足够过滤掉快速切换，同时保持响应性
const debouncedUpdateCode = useDebounceFn(updateCode, 100)

watch([selectedNode, activePlugin], () => {
  debouncedUpdateCode()
})

watch(
  options,
  () => {
    debouncedUpdateCode()
  },
  {
    deep: true
  }
)

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
          title="Copy Skill Prompt"
          style="width: auto; white-space: nowrap; padding: 0 6px"
          :disabled="isCopyingSkill"
          @click="copySkill"
        >
          Copy Skill
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
  color: var(--color-text);
}

.tp-code-svg :deep(.tp-code-content) {
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

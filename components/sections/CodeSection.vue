<script setup lang="ts">
import type { CodeBlock } from '@/codegen/types'

import Badge from '@/components/Badge.vue'
import Code from '@/components/Code.vue'
import IconButton from '@/components/IconButton.vue'
import Info from '@/components/icons/Info.vue'
import Preview from '@/components/icons/Preview.vue'
import Section from '@/components/Section.vue'
import { useToast } from '@/composables/toast'
import { selection, selectedNode, options, selectedTemPadComponent, activePlugin } from '@/ui/state'
import { getDesignComponent } from '@/utils'
import { generateCode } from '@/utils/ai/client'
import { extractSelectedNodes } from '@/utils/uiExtractor'

const componentCode = shallowRef('')
const componentLink = shallowRef('')
const codeBlocks = ref<CodeBlock[]>([])
const warning = shallowRef('')
const isGeneratingJson = ref(false)
const isGeneratingAICode = ref(false)

const aiError = ref('')
const { show } = useToast()

const playButtonTitle = computed(() =>
  componentLink.value
    ? 'Open in TemPad Playground'
    : 'The component is produced with older versions of TemPad that does not provide a link to TemPad playground.'
)

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

async function generateUIJson() {
  if (!selectedNode.value || isGeneratingJson.value) return
  
  isGeneratingJson.value = true
  try {
    const uiInfo = await extractSelectedNodes([selectedNode.value])
    // 添加一个新的代码块来显示UI JSON
    codeBlocks.value.unshift({
      name: 'ui-json',
      title: 'UI JSON',
      lang: 'json',
      code: JSON.stringify(uiInfo, null, 2)
    })

  } catch (error) {
    console.error('Failed to generate UI JSON:', error)
  } finally {
    isGeneratingJson.value = false
  }
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
  console.log('codeBlocks', codeBlocks.value)
  if ('warning' in node) {
    warning.value = node.warning
  } else {
    warning.value = ''
  }
}

async function generateAICode() {
  if (!selectedNode.value || isGeneratingAICode.value) return
  
  isGeneratingAICode.value = true
  aiError.value = ''
  
  try {
    // 移除已存在的 AI 生成代码块（如果有）
    codeBlocks.value = codeBlocks.value.filter(block => block.name !== 'ai-generated')
    
    // 创建新的 AI 代码块
    const aiCodeBlock = ref<CodeBlock>({
      name: 'ai-generated',
      title: 'AI Generating...',
      lang: 'vue',
      code: ''
    })
    
    // 将代码块添加到列表开头
    codeBlocks.value.unshift(aiCodeBlock.value)
    
    // 启动加载动画
    const loading = useLoadingTitle(aiCodeBlock)
    loading.start()
    
    const uiInfo = await extractSelectedNodes([selectedNode.value])
    
    // 使用生成器获取流式响应并实时更新
    for await (const chunk of generateCode(uiInfo, options.value.project)) {
      aiCodeBlock.value.code += chunk
    }
    
    // 停止加载动画并更新标题
    loading.stop()
    aiCodeBlock.value.title = 'AI Generated Code'
    show('AI Generated Code Success')
  } catch (err) {
    aiError.value = err instanceof Error ? err.message : 'Failed to generate AI code'
    console.error('Failed to generate AI code:', err)
    // 如果发生错误，移除正在生成的代码块
    codeBlocks.value = codeBlocks.value.filter(block => block.name !== 'ai-generated')
  } finally {
    isGeneratingAICode.value = false
  }
}

watch(options, updateCode, {
  deep: true
})

watch([selectedNode, activePlugin], updateCode)

function open() {
  window.open(componentLink.value)
}
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
          title="AI Code"
          :disabled="isGeneratingAICode || !selectedNode"
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

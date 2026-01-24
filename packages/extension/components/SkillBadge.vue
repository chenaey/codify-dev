<script setup lang="ts">
import { computed, ref } from 'vue'

import Badge from '@/components/Badge.vue'
import HoverCard from '@/components/HoverCard.vue'
import { useSkill } from '@/composables'
import { useCopy } from '@/composables'

const { status, selfActive, count, activate } = useSkill()

const isConnected = computed(() => status.value === 'connected')

const badgeTone = computed(() => {
  if (!isConnected.value) return 'neutral'
  if (!selfActive.value) return 'neutral'
  return 'success'
})

const badgeVariant = computed(() => {
  if (!isConnected.value) return 'dashed'
  if (!selfActive.value) return 'dashed'
  return 'solid'
})

// Connected state tooltip (simple)
const connectedTooltip = computed(() => {
  const fileCount = count.value || 0
  const fileLabel = fileCount > 1 ? ` • ${fileCount} files` : ''

  if (selfActive.value) {
    return `Active${fileLabel}`
  }

  return `Inactive${fileLabel}\nClick to activate`
})

const badgeStatusClass = computed(() => `tp-skill-badge-${status.value}`)
const badgeActiveClass = computed(() =>
  isConnected.value
    ? selfActive.value
      ? 'tp-skill-badge-active'
      : 'tp-skill-badge-inactive'
    : null
)

const copiedApi = ref(false)
const copiedSkill = ref(false)
const copy = useCopy()

async function copyCommand(text: string, type: 'api' | 'skill') {
  await copy(text)
  if (type === 'api') {
    copiedApi.value = true
    setTimeout(() => (copiedApi.value = false), 2000)
  } else {
    copiedSkill.value = true
    setTimeout(() => (copiedSkill.value = false), 2000)
  }
}

function handleClick() {
  if (isConnected.value) {
    activate()
  }
}
</script>

<template>
  <!-- When disconnected, show HoverCard with installation instructions -->
  <HoverCard placement="bottom" :show-delay="300">
    <Badge :class="['tp-skill-badge', badgeStatusClass, badgeActiveClass]" :tone="badgeTone" :variant="badgeVariant"
      @dblclick.stop>
      <span class="tp-skill-dot" />
      Skill
    </Badge>
    <template #content>
      <div class="tp-skill-hover-content">
        <div class="tp-skill-hover-title">
          {{ selfActive ? 'API Server Connected' : 'API Server Disconnected' }}
        </div>
        <div class="tp-skill-hover-desc">
          Agent 可通过 Codify Skill 连接设计系统，实时解析设计数据并自动生成符合规范的组件代码。
        </div>
        <div class="tp-skill-hover-section">
          <div class="tp-skill-hover-label">1. 启动 API 服务器 - 提供设计数据标准化接口</div>
          <div class="tp-skill-code-wrapper">
            <code class="tp-skill-hover-code">npx @codify-dev/api-server</code>
            <button class="tp-skill-copy-btn" :class="{ copied: copiedApi }"
              @click="copyCommand('npx @codify-dev/api-server', 'api')">
              {{ copiedApi ? '✓' : '复制' }}
            </button>
          </div>
        </div>

        <div class="tp-skill-hover-section">
          <div class="tp-skill-hover-label">2. 安装 Skill - 赋予Agent设计转代码能力</div>
          <div class="tp-skill-code-wrapper">
            <code class="tp-skill-hover-code small">
              npx add-skill https://github.com/chenaey/codify-dev/tree/release/skill/codify-skill
            </code>
            <button class="tp-skill-copy-btn" :class="{ copied: copiedSkill }" @click="
              copyCommand(
                'npx add-skill https://github.com/chenaey/codify-dev/tree/release/skill/codify-skill',
                'skill'
              )
              ">
              {{ copiedSkill ? '✓' : '复制' }}
            </button>
          </div>
        </div>

        <div class="tp-skill-hover-section">
          <div class="tp-skill-hover-label">3. 使用说明</div>
          <div class="tp-skill-usage-text">
            • 选中设计节点/复制节点链接 → Agent 调用 Codify Skill<br />
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;（建议同时提供截图，效果更佳）
            <br />
            &nbsp;&nbsp;→ 自动生成符合项目规范的精准组件代码
          </div>
        </div>
      </div>
    </template>
  </HoverCard>
</template>

<style scoped>
.tp-skill-badge {
  gap: 4px;
}

.tp-skill-badge-inactive .tp-skill-dot {
  animation: tp-skill-dot-pulse 1.2s ease-in-out infinite;
  background-color: var(--color-icon-brand, #0d99ff);
}

.tp-skill-badge-connected:hover {
  border-style: solid;
}

.tp-skill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-icon-disabled, #9ba1a6);
  box-sizing: border-box;
}

.tp-skill-badge-active .tp-skill-dot {
  background-color: var(--color-icon-success, #1bc47d);
}

@keyframes tp-skill-dot-pulse {

  0%,
  100% {
    opacity: 0.2;
  }

  50% {
    opacity: 1;
  }
}

/* Hover content styles */
/* Hover content styles */
.tp-skill-hover-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 300px;
}

.tp-skill-hover-title {
  font-weight: 600;
  font-size: 12px;
  color: var(--color-text);
  margin-bottom: -4px;
}

.tp-skill-hover-desc {
  font-size: 10px;
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.tp-skill-hover-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  user-select: text;
}

.tp-skill-hover-label {
  font-size: 10px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.tp-skill-code-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
  padding: 4px;
}

.tp-skill-hover-code {
  flex: 1;
  font-family: var(--font-family-code, monospace);
  font-size: 11px;
  padding: 2px 4px;
  color: var(--color-text-brand);
  user-select: all;
  cursor: text;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tp-skill-hover-code.small {
  font-size: 9px;
  white-space: normal;
  word-break: break-all;
  line-height: 1.3;
}

.tp-skill-copy-btn {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 10px;
  background: var(--color-bg-brand);
  color: var(--color-text-onbrand);
  border: none;
  border-radius: 3px;
  user-select: text;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 500;
}

.tp-skill-copy-btn:hover {
  background: var(--color-bg-brand-hover);
  transform: translateY(-1px);
}

.tp-skill-copy-btn:active {
  transform: translateY(0);
}

.tp-skill-copy-btn.copied {
  background: var(--color-bg-success);
  color: var(--color-text-onsuccess, #fff);
}

.tp-skill-usage-text {
  font-size: 10px;
  line-height: 1.4;
  color: var(--color-text-secondary);
  padding: 4px 6px;
  background: var(--color-bg-secondary);
  border-radius: 4px;
}

.tp-skill-tip {
  color: var(--color-text-tertiary);
  font-style: italic;
  font-size: 9px;
  display: block;
  margin-top: 2px;
}

/* Ensure text selection works */
.tp-skill-hover-content * {
  user-select: text;
  -webkit-user-select: text;
}

.tp-skill-usage-hint {
  font-size: 9px;
  line-height: 1.3;
  color: var(--color-text-tertiary);
  margin-top: 2px;
  padding-left: 4px;
}

.tp-skill-hover-hint {
  font-size: 10px;
  color: var(--color-text-tertiary);
  font-style: italic;
  text-align: center;
  padding-top: 4px;
  border-top: 1px solid var(--color-border);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'

import Badge from '@/components/Badge.vue'
import HoverCard from '@/components/HoverCard.vue'
import { useSkill } from '@/composables'

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
  isConnected.value ? (selfActive.value ? 'tp-skill-badge-active' : 'tp-skill-badge-inactive') : null
)

function handleClick() {
  if (isConnected.value) {
    activate()
  }
}
</script>

<template>
  <!-- When disconnected, show HoverCard with installation instructions -->
  <HoverCard v-if="!isConnected" placement="bottom" :show-delay="300">
    <Badge
      :class="['tp-skill-badge', badgeStatusClass]"
      :tone="badgeTone"
      :variant="badgeVariant"
      @dblclick.stop
    >
      <span class="tp-skill-dot" />
      API
    </Badge>
    <template #content>
      <div class="tp-skill-hover-content">
        <div class="tp-skill-hover-title">Skill Server Unavailable</div>
        <div class="tp-skill-hover-section">
          <div class="tp-skill-hover-label">Install:</div>
          <code class="tp-skill-hover-code">npm i -g @anthropic-ai/codemaker-skill-server</code>
        </div>
        <div class="tp-skill-hover-section">
          <div class="tp-skill-hover-label">Run:</div>
          <code class="tp-skill-hover-code">codemaker-skill-server</code>
        </div>
        <div class="tp-skill-hover-hint">Then refresh this page.</div>
      </div>
    </template>
  </HoverCard>

  <!-- When connected, use simple title tooltip -->
  <Badge
    v-else
    :class="['tp-skill-badge', badgeStatusClass, badgeActiveClass]"
    :tone="badgeTone"
    :variant="badgeVariant"
    :title="connectedTooltip"
    @click="handleClick"
    @dblclick.stop
  >
    <span class="tp-skill-dot" />
    API
  </Badge>
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
.tp-skill-hover-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tp-skill-hover-title {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 2px;
}

.tp-skill-hover-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tp-skill-hover-label {
  font-size: 10px;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tp-skill-hover-code {
  font-family: var(--font-family-code, monospace);
  font-size: 11px;
  background: var(--color-bg-secondary);
  padding: 4px 6px;
  border-radius: 4px;
  color: var(--color-text-brand);
  user-select: all;
  cursor: text;
  white-space: nowrap;
}

.tp-skill-hover-hint {
  font-size: 10px;
  color: var(--color-text-tertiary);
  font-style: italic;
}
</style>
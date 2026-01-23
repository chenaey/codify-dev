<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Delay before showing the hover card (ms) */
    showDelay?: number
    /** Delay before hiding thehover card (ms) */
    hideDelay?: number
    /** Placement of the hover card */
    placement?: 'top' | 'bottom' | 'left' | 'right'
    /** Whether the hover card is disabled */
    disabled?: boolean
  }>(),
  {
    showDelay: 200,
    hideDelay: 150,
    placement: 'bottom',
    disabled: false
  }
)

const isVisible = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const cardRef = ref<HTMLElement | null>(null)
const cardStyle = ref<{ top: string; left: string }>({ top: '0', left: '0' })

let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function updatePosition() {
  if (!triggerRef.value || !cardRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const cardRect = cardRef.value.getBoundingClientRect()
  const gap = 6

  let top = 0
  let left = 0

  switch (props.placement) {
    case 'bottom':
      top = triggerRect.bottom + gap
      left = triggerRect.left + triggerRect.width / 2 - cardRect.width / 2
      break
    case 'top':
      top = triggerRect.top - cardRect.height - gap
      left = triggerRect.left + triggerRect.width / 2 - cardRect.width / 2
      break
    case 'left':
      top = triggerRect.top + triggerRect.height / 2 - cardRect.height / 2
      left = triggerRect.left - cardRect.width - gap
      break
    case 'right':
      top = triggerRect.top + triggerRect.height / 2 - cardRect.height / 2
      left = triggerRect.right + gap
      break
  }

  // Keep within viewport bounds
  const padding = 8
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Horizontal bounds
  if (left < padding) {
    left = padding
  } else if (left + cardRect.width > viewportWidth - padding) {
    left = viewportWidth - cardRect.width - padding
  }

  // Vertical bounds
  if (top < padding) {
    top = padding
  } else if (top + cardRect.height > viewportHeight - padding) {
    top = viewportHeight - cardRect.height - padding
  }

  cardStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  }
}

function show() {
  if (props.disabled) return
  clearTimers()
  showTimer = setTimeout(() => {
    isVisible.value = true
    nextTick(() => {
      updatePosition()
    })
  }, props.showDelay)
}

function hide() {
  clearTimers()
  hideTimer = setTimeout(() => {
    isVisible.value = false
  }, props.hideDelay)
}

function onTriggerEnter() {
  show()
}

function onTriggerLeave() {
  hide()
}

function onCardEnter() {
  clearTimers()
}

function onCardLeave() {
  hide()
}

// Update position on scroll/resize
function handleScrollOrResize() {
  if (isVisible.value) {
    updatePosition()
  }
}

watch(isVisible, (visible) => {
  if (visible) {
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
  } else {
    window.removeEventListener('scroll', handleScrollOrResize, true)
    window.removeEventListener('resize', handleScrollOrResize)
  }
})

onBeforeUnmount(() => {
  clearTimers()
  window.removeEventListener('scroll', handleScrollOrResize, true)
  window.removeEventListener('resize', handleScrollOrResize)
})

const placementClass = computed(() => `tp-hover-card-${props.placement}`)
</script>

<template>
  <div class="tp-hover-card-wrapper">
    <div
      ref="triggerRef"
      class="tp-hover-card-trigger"
      @mouseenter="onTriggerEnter"
      @mouseleave="onTriggerLeave"
    >
      <slot />
    </div>
    <Teleport to="body">
      <Transition name="tp-hover-card">
        <div
          v-if="isVisible && !disabled"
          ref="cardRef"
          :class="['tp-hover-card', placementClass]"
          :style="cardStyle"
          @mouseenter="onCardEnter"
          @mouseleave="onCardLeave"
        >
          <div class="tp-hover-card-content">
            <slot name="content" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tp-hover-card-wrapper {
  position: relative;
  display: inline-flex;
}

.tp-hover-card-trigger {
  display: inline-flex;
}

.tp-hover-card {
  position: fixed;
  z-index: 10000;
  pointer-events: auto;
}

.tp-hover-card-content {
  background: var(--color-bg, #2c2c2c);
  border: 1px solid var(--color-border, #444);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  padding: 8px 10px;
  font-size: 11px;
  line-height: 1.5;
  color: var(--color-text, #fff);
  min-width: 200px;
  max-width: 400px;
  width: max-content;
  user-select: text;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Transition */
.tp-hover-card-enter-active,
.tp-hover-card-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.tp-hover-card-enter-from,
.tp-hover-card-leave-to {
  opacity: 0;
}

.tp-hover-card-bottom.tp-hover-card-enter-from,
.tp-hover-card-bottom.tp-hover-card-leave-to {
  transform: translateY(-4px);
}

.tp-hover-card-top.tp-hover-card-enter-from,
.tp-hover-card-top.tp-hover-card-leave-to {
  transform: translateY(4px);
}

.tp-hover-card-left.tp-hover-card-enter-from,
.tp-hover-card-left.tp-hover-card-leave-to {
  transform: translateX(4px);
}

.tp-hover-card-right.tp-hover-card-enter-from,
.tp-hover-card-right.tp-hover-card-leave-to {
  transform: translateX(-4px);
}

/* Selection styles */
.tp-hover-card-content ::selection {
  background: var(--color-bg-brand, #0d99ff);
  color: var(--color-text-onbrand, #fff);
}
</style>
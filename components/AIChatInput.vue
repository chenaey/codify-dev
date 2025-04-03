<script setup lang="ts">
import Send from '@/components/icons/Send.vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps({
  disabled: Boolean,
  loading: Boolean
})

const emit = defineEmits<{
  (e: 'send', value: string): void
  (e: 'clear'): void
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isInputEmpty = computed(() => !input.value.trim())

// 自动调整高度
function adjustHeight() {
  if (!textareaRef.value) return
  
  // 重置高度，让scrollHeight准确计算
  textareaRef.value.style.height = 'auto'
  
  // 计算新高度，但最大不超过200px
  const newHeight = Math.min(textareaRef.value.scrollHeight, 200)
  textareaRef.value.style.height = `${newHeight}px`
}

// 监听输入，自动调整高度
watch(() => input.value, () => {
  nextTick(() => adjustHeight())
})

// 组件挂载时初始化高度
onMounted(() => {
  adjustHeight()
})

function sendMessage() {
  if (input.value.trim() && !props.disabled && !props.loading) {
    emit('send', input.value)
    input.value = ''
    // 发送后重置高度
    nextTick(() => adjustHeight())
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

function clearHistory() {
  emit('clear')
}
</script>

<template>
  <div class="chat-container">
    <div class="input-container">
      <textarea
        ref="textareaRef"
        v-model="input"
        class="chat-input"
        placeholder="不满意？告诉我哪里需要调整..."
        @keydown="handleKeydown"
        @focus="adjustHeight"
        rows="2"
      ></textarea>
      <div class="button-group">
        <div 
          class="send-button"
          :class="{ 'send-button-disabled': isInputEmpty || disabled || loading }"
          @click="sendMessage"
        >
          <Send />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  margin-bottom: 8px;
}

.input-container {
  position: relative;
  display: flex;
  border: 1px solid var(--color-border, #424451);
  border-radius: var(--radius-medium, 8px);
  padding: 8px;
  background-color: var(--color-bg, #2b2d38);
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  resize: none;
  overflow-y: auto;
  padding: 4px 0;
  min-height: 24px;
  max-height: 200px; /* 最大高度 */
  height: 24px; /* 初始高度 */
  color: var(--color-text, #F8FAFF);
  line-height: 1.5;
}

.chat-input::placeholder {
  font-size: 14px;
  color: var(--color-text, #F8FAFF);
  opacity: 0.5;
}

.button-group {
  position: absolute;
  bottom: 8px;
  display: flex;
  right: 8px;
  align-items: center;
}

.send-button {
  cursor: pointer;
}

.send-button-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const modalContent = ref<HTMLElement | null>(null)

// 处理ESC键关闭弹窗
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.show) {
    emit('close')
  }
}

// 处理遮罩层点击
const handleOverlayClick = (e: MouseEvent) => {
  // 只有点击到遮罩层本身（而非其子元素）时才关闭
  if (e.target === e.currentTarget) {
    emit('close')
  }
}

// 阻止遮罩层的滚动事件冒泡
const handleWheel = (e: WheelEvent) => {
  // 如果点击的是遮罩层本身（而非其子元素），则阻止滚动
  if (e.target === e.currentTarget) {
    e.preventDefault()
  }
}

// 监听弹窗显示状态变化
watch(
  () => props.show,
  (newVal) => {
    if (newVal && modalContent.value) {
      // 弹窗显示时，聚焦到内容区域
      modalContent.value.focus()
    }
  }
)

// 添加和移除全局事件监听器
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="handleOverlayClick" @wheel.prevent="handleWheel">
      <div class="modal-content" ref="modalContent" tabindex="-1" @keydown.esc="$emit('close')">
        <div class="modal-header">
          <button class="close-button" @click="$emit('close')">&times;</button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-bg);
  border-radius: 8px;
  width: 90%;
  height: 90%;
  max-width: 1200px;
  position: relative;
  outline: none; /* 移除聚焦时的外边框 */
}

.modal-header {
  padding: 8px;
  text-align: right;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  margin-right: 12px;
  color: var(--color-text);
}

.modal-body {
  height: calc(100% - 80px);
  padding: 0 16px 16px 16px;
}
</style>

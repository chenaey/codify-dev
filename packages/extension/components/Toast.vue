<script setup lang="ts">
import { toastMessage, toastShown } from '@/composables/toast'
</script>

<template>
  <Teleport to="body">
    <div class="tp-toast" :aria-hidden="`${!toastShown}`">
      <div
        class="tp-toast-message"
        :class="{
          'tp-toast-message-shown': toastShown
        }"
      >
        <div class="tp-toast-text">{{ toastMessage }}</div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tp-toast {
  position: fixed;
  display: flex;
  width: 100%;
  bottom: 24px;
  pointer-events: none;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: bottom 0.2s;
}

.tp-toast-message {
  background: var(--figma-color-bg-inverse, #333);
  transition: transform 0.3s ease-out;
  visibility: hidden;
  transition-property: transform, opacity;
  transform: translate3d(0, 3px, 0);
  opacity: 0;
  user-select: none;
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  align-items: center;
  max-width: 800px;
  margin: 0 50px;
  pointer-events: none;
  box-shadow: 0px 5px 17px rgba(0, 0, 0, 0.2), 0px 2px 7px rgba(0, 0, 0, 0.15);
  font-size: 14px;
  line-height: 24px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  color: var(--figma-color-text-oninverse, #fff);
}

.tp-toast-message-shown {
  transform: translateZ(0);
  opacity: 1;
  transition-duration: 0.1s;
  visibility: visible;
  transition-delay: 0ms;
  pointer-events: auto;
  cursor: default;
}

.tp-toast-text {
  padding: 6px 16px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

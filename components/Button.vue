<template>
  <button
    class="tp-button"
    :class="{ 'tp-button-primary': primary }"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  primary?: boolean
}>()
</script>

<style scoped>
.tp-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: var(--radius-medium);
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text);
  transition: all 0.2s;
}

.tp-button:hover {
  background: var(--color-bg-hover);
}

.tp-button-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.tp-button-primary:hover {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}
</style> 
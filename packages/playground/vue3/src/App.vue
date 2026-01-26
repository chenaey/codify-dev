<template>
  <div class="app">
    <ExampleCard />
  </div>
</template>

<script setup lang="ts">
import ExampleCard from './components/ExampleCard.vue'

const handleStop = () => {
  console.log('停止生成')
}

const handleRefresh = () => {
  console.log('刷新回答')
}
</script>

<style lang="less" scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px;
  background: #f9f9f9;
}

.header {
  text-align: center;
  margin-bottom: 48px;

  h1 {
    font-size: 28px;
    color: #1a1a1a;
    margin-bottom: 8px;
  }

  p {
    color: #666;
    font-size: 14px;
  }
}

.section {
  margin-bottom: 32px;

  h2 {
    font-size: 18px;
    color: #333;
    margin-bottom: 16px;
    padding-bottom: 8px;
  }
}

.component-container {
  border-radius: 8px;
}
</style>

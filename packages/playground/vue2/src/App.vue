<template>
  <div class="app">
    <header class="header">
      <h1>UI Playground - Vue 2</h1>
      <p>在下方添加从 Figma/MasterGo 生成的组件进行测试</p>
    </header>

    <main class="main">
      <section class="section">
        <h2>示例组件</h2>
        <div class="component-container">
          <ExampleCard />
        </div>
      </section>

      <!-- 在这里添加更多组件测试区域 -->
    </main>
  </div>
</template>

<script>
import ExampleCard from './components/ExampleCard.vue'

export default {
  name: 'App',
  components: {
    ExampleCard
  }
}
</script>

<style lang="less" scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
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
    border-bottom: 1px solid #eee;
  }
}

.component-container {
  padding: 24px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px dashed #ddd;
}
</style>

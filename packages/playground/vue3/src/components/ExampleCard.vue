<template>
  <div class="example-card">
    <div class="icon-row">
      <img src="@shared/icons/icon-ip.svg" alt="IP" class="icon" />
      <span class="label">示例卡片</span>
    </div>
    <p class="description">
      这是一个示例组件，展示如何使用共享资源中的图标。
    </p>
    <div class="actions">
      <button class="btn btn-primary">确认</button>
      <button class="btn btn-secondary">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 组件逻辑
</script>

<style lang="less" scoped>
.example-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  max-width: 320px;
}

.icon-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.icon {
  width: 32px;
  height: 32px;
}

.label {
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
}

.description {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 16px;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.85;
  }
}

.btn-primary {
  background: #1890ff;
  color: #fff;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}
</style>

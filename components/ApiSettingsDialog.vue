<script setup lang="ts">
import { options } from '@/ui/state'
import { ref, watch, computed } from 'vue'

const apiSettings = computed(() => options.value.apiSettings || {
  apiKey: '',
  baseURL: 'https://api.deepseek.com/v1',
  modelName: 'deepseek-chat',
  showApiSettings: false
})

// 创建本地状态，避免直接修改存储的值
const localApiKey = ref(apiSettings.value.apiKey )
const localBaseURL = ref(apiSettings.value.baseURL)
const localModelName = ref(apiSettings.value.modelName)
// 当对话框打开时，重置本地状态
watch(() => apiSettings.value.showApiSettings, (newValue) => {
  if (newValue) {
    localApiKey.value = apiSettings.value.apiKey
    localBaseURL.value = apiSettings.value.baseURL 
    localModelName.value = apiSettings.value.modelName
  }
})

// 保存设置
function saveSettings() {
  // 确保 apiSettings 已经初始化
  if (!options.value.apiSettings) {
    options.value.apiSettings = {
      apiKey: '',
      baseURL: '',
      showApiSettings: false
    }
  }
  
  options.value.apiSettings.apiKey = localApiKey.value
  options.value.apiSettings.baseURL = localBaseURL.value
  options.value.apiSettings.modelName = localModelName.value
  closeDialog()
}

// 关闭对话框
function closeDialog() {
  // 安全地设置属性
  if (options.value.apiSettings) {
    options.value.apiSettings.showApiSettings = false
  }
}

// 重置为默认值
function resetToDefaults() {
  localApiKey.value = ''
  localModelName.value = 'deepseek-chat'
  localBaseURL.value = 'https://api.deepseek.com/v1'
}
</script>

<template>
  <div class="dialog-overlay" v-if="apiSettings.showApiSettings" @click="closeDialog">
    <div class="dialog-content" @click.stop>
      <div class="dialog-header">
        <h3>API 设置</h3>
        <button class="close-button" @click="closeDialog">×</button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label for="api-key">OPENAI_API_KEY</label>
          <input 
            id="api-key" 
            type="text" 
            v-model="localApiKey" 
            class="settings-input"
            placeholder="apiKey"
          />
        </div>
        
        <div class="form-group">
          <label for="base-url">OPENAI_BASE_URL</label>
          <input 
            id="base-url" 
            type="text" 
            v-model="localBaseURL" 
            class="settings-input"
            placeholder="baseURL"
          />
        </div>
        <div class="form-group">
          <label for="base-name">MODEL_NAME</label>
          <input 
            id="model-name" 
            type="text" 
            v-model="localModelName" 
            class="settings-input"
            placeholder="MODEL_NAME"
          />
        </div>
      </div>
      <div class="dialog-footer">
        <button class="save-button" @click="saveSettings">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background-color: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90%;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 16px 8px;
  border-bottom: 1px solid #e9e9e9;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.close-button:hover {
  color: #333;
}

.dialog-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.settings-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.settings-input:focus {
  border-color: #18a0fb;
  outline: none;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #e9e9e9;
  gap: 8px;
}

.save-button, .reset-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;
}

.save-button {
  background-color: #18a0fb;
  color: white;
}

.save-button:hover {
  background-color: #0d8ee9;
}

.reset-button {
  background-color: transparent;
  color: #333;
  border: 1px solid #e0e0e0;
}

.reset-button:hover {
  background-color: #f5f5f5;
}
</style> 
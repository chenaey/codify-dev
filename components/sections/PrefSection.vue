<script setup lang="ts">
import ApiSettingsDialog from '@/components/ApiSettingsDialog.vue'
import IconButton from '@/components/IconButton.vue'
import Inspect from '@/components/icons/Inspect.vue'
import Measure from '@/components/icons/Measure.vue'
import Export from '@/components/icons/Plus.vue'
import Section from '@/components/Section.vue'
// import PluginsSection from '@/components/sections/PluginsSection.vue'
import { useSelectAll } from '@/composables/input'
import { options } from '@/ui/state'

const root = ref<InstanceType<typeof Section> | null>(null)

watch(
  () => options.value.prefOpen,
  (open) => {
    if (open) {
      root.value?.$el.scrollIntoView()
    }
  },
  {
    flush: 'post'
  }
)
const projects = ref([
  {
    value: 'mvvm',
    label: 'Vue2 (CSS Module + rem)'
  },
  {
    value: 'vue3',
    label: 'Vue3 (Setup + Scoped CSS)'
  },
  {
    value: 'cbg',
    label: 'Vue3 (Setup + CSS Module + Less)'
  },
  {
    value: 'modern-js',
    label: 'modern-js'
  },
  {
    value: 'ios',
    label: 'React Native'
  },
  {
    value: 'android',
    label: 'Android'
  }
])

const fontSizeInput = useTemplateRef('fontSizeInput')
useSelectAll(fontSizeInput)

const scaleInput = useTemplateRef('scaleInput')
useSelectAll(scaleInput)

// 打开API设置对话框
function openApiSettings() {
  // 确保 apiSettings 已经初始化
  if (!options.value.apiSettings) {
    options.value.apiSettings = {
      apiKey: '',
      baseURL: '',
      showApiSettings: false
    }
  }
  
  options.value.apiSettings.showApiSettings = true
}
</script>

<template>
  <Section ref="root" class="tp-pref">
    <div class="tp-row tp-row-justify tp-pref-field">
      <label>Tools</label>
      <div class="tp-row tp-gap">
        <IconButton title="Deep select" toggle="subtle" v-model:selected="options.deepSelectOn">
          <Inspect />
        </IconButton>
        <IconButton
          title="Measure to selection"
          toggle="subtle"
          v-model:selected="options.measureOn"
        >
          <Measure />
        </IconButton>
        <IconButton title="Export images" toggle="subtle" v-model:selected="options.exportOn">
          <Export />
        </IconButton>
      </div>
    </div>
    <div class="tp-row tp-row-justify tp-pref-field tb-pref-plugin">
      <label for="project-select">Project</label>
      <select id="project-select" class="tp-pref-input" v-model="options.project">
        <option v-for="project in projects" :key="project.value" :value="project.value">
          {{ project.label }}
        </option>
      </select>
    </div>
    <div class="tp-row tp-row-justify tp-pref-field">
        <label for="css-unit">CSS unit</label>
        <select id="css-unit" class="tp-pref-input" v-model="options.cssUnit">
          <option value="px">px</option>
          <option value="rem">rem</option>
        </select>
      </div>
      <div class="tp-row tp-row-justify tp-pref-field">
        <label for="root-font-size">Root font size</label>
        <input
          id="root-font-size"
          class="tp-pref-input"
          ref="fontSizeInput"
          type="number"
          v-model.number="options.rootFontSize"
        />
      </div>
      <div class="tp-row tp-row-justify tp-pref-field tb-pref-plugin">
        <label for="scale">Scale</label>
        <input
          id="scale"
          class="tp-pref-input"
          ref="scaleInput"
          type="number"
          step="1"
          v-model.number="options.scale"
        />
      </div>
      
      <!-- 添加API设置按钮 -->
      <div class="tp-row tp-row-justify tp-pref-field tb-pref-plugin">
        <label>API 设置</label>
        <button class="api-settings-button" @click="openApiSettings">
          配置 DeepSeek API
        </button>
      </div>
      
    <!-- <PluginsSection class="tp-pref-plugins" /> -->
    
    <!-- 添加API设置对话框 -->
    <ApiSettingsDialog />
  </Section>
</template>

<style scoped>
.tp-pref {
  --tp-section-padding-bottom: 0;
}

.tp-pref-field + .tp-pref-field {
  margin-top: 8px;
}

.tp-pref-input {
  width: 80px;
}

.tp-pref-plugins {
  margin-top: 8px;
}
.tb-pref-plugin {
  margin-bottom: 8px;
}

label {
  cursor: default;
}

[data-fpl-version='ui3'] label {
  color: var(--color-text-secondary);
}

/* API设置按钮样式 */
.api-settings-button {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
}

.api-settings-button:hover {
  background-color: #e8e8e8;
}
</style>

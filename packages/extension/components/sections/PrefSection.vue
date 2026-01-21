<script setup lang="ts">
import ApiSettingsDialog from '@/components/ApiSettingsDialog.vue'
import IconButton from '@/components/IconButton.vue'
import Inspect from '@/components/icons/Inspect.vue'
import Measure from '@/components/icons/Measure.vue'
import Export from '@/components/icons/Plus.vue'
import Preferences from '@/components/icons/Preferences.vue'
import ProjectManager from '@/components/ProjectManager.vue'
import Section from '@/components/Section.vue'
import McpSection from '@/components/sections/McpSection.vue'
import PluginsSection from '@/components/sections/PluginsSection.vue'
import Select, { type SelectOption } from '@/components/Select.vue'
import { useSelectAll } from '@/composables'
import { useUserProjects } from '@/composables/useUserProjects'
import { options } from '@/ui/state'

// 接收 collapsed 属性
defineProps<{
  collapsed?: boolean
}>()

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

// 用户项目管理
const { userProjects } = useUserProjects()

// 内置项目列表
const builtInProjects = [
  { id: 'mvvm', name: 'Vue2 (CSS Module + rem)', isBuiltIn: true },
  { id: 'vue3', name: 'Vue3 (Setup + Scoped CSS)', isBuiltIn: true },
  { id: 'cbg', name: 'Vue3 (Setup + CSS Module + Less)', isBuiltIn: true },
  { id: 'modern-js', name: 'modern-js', isBuiltIn: true },
  { id: 'ios', name: 'React Native', isBuiltIn: true },
  { id: 'android', name: 'Android', isBuiltIn: true }
]

// 合并所有项目
const allProjects = computed(() => {
  const userProjectsWithFlag = userProjects.value.map((p) => ({
    id: p.id,
    name: p.name,
    isBuiltIn: false
  }))
  return [...builtInProjects, ...userProjectsWithFlag]
})

// 项目管理弹窗状态
const showProjectManager = ref(false)

const fontSizeInput = useTemplateRef('fontSizeInput')
useSelectAll(fontSizeInput)

const scaleInput = useTemplateRef('scaleInput')
useSelectAll(scaleInput)

const cssUnitOptions = [
  { label: 'px', value: 'px' },
  { label: 'rem', value: 'rem' }
] as const satisfies SelectOption[]

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
  <Section ref="root" class="tp-pref" :collapsed="collapsed">
    <div class="tp-row tp-row-justify tp-pref-field">
      <label>Tools</label>
      <div class="tp-row tp-gap">
        <IconButton title="Deep select" toggle v-model:selected="options.deepSelectOn">
          <Inspect />
        </IconButton>
        <IconButton title="Measure to selection" toggle v-model:selected="options.measureOn">
          <Measure />
        </IconButton>
        <IconButton title="Export images" toggle="subtle" v-model:selected="options.exportOn">
          <Export />
        </IconButton>
      </div>
    </div>

    <div class="tp-row tp-row-justify tp-pref-field tb-pref-plugin">
      <label for="project-select">Project</label>
      <div class="project-selector">
        <IconButton title="Manage projects" variant="secondary" @click="showProjectManager = true">
          <Preferences />
        </IconButton>
        <select id="project-select" class="tp-pref-input" v-model="options.project">
          <option v-for="project in allProjects" :key="project.id" :value="project.id">
            {{ project.name }}
          </option>
        </select>
      </div>
    </div>

    <div class="tp-row tp-row-justify tp-pref-field">
      <label for="css-unit">CSS unit</label>
      <Select
        id="css-unit"
        class="tp-pref-input"
        :options="cssUnitOptions"
        v-model="options.cssUnit"
      />
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
    <div class="tp-row tp-row-justify tp-pref-field">
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
      <button class="api-settings-button" @click="openApiSettings">配置 DeepSeek API</button>
    </div>
    <McpSection class="tp-pref-mcp" />
    <PluginsSection class="tp-pref-plugins" />
  </Section>

  <!-- 项目管理器 -->
  <ProjectManager v-model:show="showProjectManager" />

  <!-- API 设置弹窗 -->
  <ApiSettingsDialog v-if="options.apiSettings?.showApiSettings" />
</template>

<style scoped>
.tp-pref {
  --tp-section-padding-bottom: 0;
}

.tp-pref-mcp,
.tp-pref-plugins {
  margin-top: 12px;
  margin-left: -12px;
  margin-right: -12px;
  --tp-section-padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.tp-pref-field + .tp-pref-field {
  margin-top: 8px;
}

.tp-pref-input {
  width: 80px;
}

.tb-pref-plugin {
  margin-bottom: 8px;
}

label {
  cursor: default;
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

.project-selector {
  display: flex;
  gap: 4px;
  align-items: center;
}

.project-selector select {
  flex: 1;
}
</style>

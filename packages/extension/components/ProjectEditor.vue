<script setup lang="ts">
import { useUserProjects, type UserProject } from '@/composables/useUserProjects'

const props = defineProps<{
  show: boolean
  project?: UserProject | null
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const { addUserProject, updateUserProject } = useUserProjects()

// 默认提示词模板
const defaultPrompt = `核心要求：
1. 基于提供的Figma节点JSON数据，生成组件代码
2. 使用 Vue3 + Setup + Scoped CSS 语法
3. 严格遵循响应式设计原则
4. 输出组件代码，不要输出任何解释

组件开发规范：

1. 响应式铁律：
   - 容器组件禁止设置：width/height/min-width/min-height这些属性为固定数值，允许设置100%。
   - 允许设置：max-width/max-height（仅限非容器元素）
   - 考虑容器的自适应

2. 布局准则：
   - 使用Flex实现弹性布局
   - 严格遵循数据的嵌套结构，严格遵循节点中的layoutMode定义：
     'HORIZONTAL' - 水平布局模式，相当于CSS中的 display: flex，子元素会在水平方向上排列。
     'VERTICAL' - 垂直布局模式，相当于CSS中的 display: flex 和 flex-direction: column，子元素会在垂直方向上排列。
   - 必须递归处理所有嵌套层级的layoutMode，不要遗漏任何子节点

3. 层级优化：
   - 相同布局方向的连续Frame可以合并
   - 没有实际样式/间距影响的中间层Frame可以去除
   - 避免不必要的div嵌套，不需要多余的div，对于这种情况 在不影响布局的情况下，必须简化为。
      例如这里有三层嵌套一个内容：
         <div ><div> <div>内容 </div> </div> </div>
      应该简化为：
         <div> 内容 </div>

4. 严格遵循数据驱动视图原则：将模板内容数据化，避免硬编码，使数据和视图解耦。
   - 数据结构相似性/UI相似性达60%以上时，应该明确使用v-for，差异的部分用字段来标识
   - template中的文本内容都应该使用数据驱动，需要明确定义在 data/props 中
   - 根据提供的JSON结构设计合理的组件数据结构，比如根据children字段来设计应用v-for的列表数据结构
   - 确保组件数据结构合理，必须包含JSON中所有文本节点，不要遗漏任何数据。

样式处理规则：
1. 样式优先级：每个节点有一个customStyle的字段，是已经格式化好的样式，如果当前节点有跟customStyle已经定义的相同的CSS key则优先用customStyle，不需要修改里面的rem等函数。
2. 单位保留：不转换rem()等函数，原样保留
3. 默认值过滤：如font-size:normal等默认值应省略

代码质量要求：
- 减少重复代码：必须将所有重复的节点转换为 v-for 循环，提高复用性。
- 优化样式管理：提取共用的样式类，避免内联样式，并使用语义化的 class 命名。
- 提高可读性：优化模板逻辑，使代码更加清晰，避免不必要的逻辑嵌套。

禁止事项：
- 出现重复的模板代码`

// 表单数据
const projectForm = ref({
  name: '',
  prompt: ''
})

// 监听项目变化，更新表单
watch(
  () => props.project,
  (project) => {
    if (project) {
      projectForm.value = {
        name: project.name,
        prompt: project.prompt
      }
    } else {
      projectForm.value = {
        name: '',
        prompt: defaultPrompt
      }
    }
  },
  { immediate: true }
)

// 保存项目
function saveProject() {
  if (!projectForm.value.name.trim() || !projectForm.value.prompt.trim()) {
    return
  }

  if (props.project) {
    // 更新现有项目
    updateUserProject(props.project.id, {
      name: projectForm.value.name.trim(),
      prompt: projectForm.value.prompt.trim()
    })
  } else {
    // 创建新项目
    addUserProject({
      name: projectForm.value.name.trim(),
      prompt: projectForm.value.prompt.trim()
    })
  }

  close()
}

// 关闭弹窗
function close() {
  emit('update:show', false)
}

// 计算属性
const isEditing = computed(() => !!props.project)
const canSave = computed(() => projectForm.value.name.trim() && projectForm.value.prompt.trim())
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="close">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <div class="modal-title">{{ isEditing ? 'Edit project' : 'New project' }}</div>
        <button @click="close" class="modal-close">×</button>
      </div>

      <div class="modal-content">
        <div class="form-field">
          <label class="form-label">Project name</label>
          <input
            v-model="projectForm.name"
            class="form-input"
            placeholder="Enter project name"
            maxlength="50"
          />
        </div>

        <div class="form-field form-field-large">
          <label class="form-label">AI Prompt</label>
          <div class="textarea-container">
            <textarea
              v-model="projectForm.prompt"
              class="form-textarea"
              placeholder="Enter custom AI prompt..."
            />
          </div>
        </div>

        <div class="modal-actions">
          <button @click="close" class="btn btn-secondary">Cancel</button>
          <button @click="saveProject" class="btn btn-primary" :disabled="!canSave">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal {
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-width: 640px;
  width: 90%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid #e9e9e9;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e9e9e9;
  background: #ffffff;
}

.modal-title {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #666666;
  padding: 2px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.modal-close:hover {
  background: #f0f0f0;
}

.modal-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field-large {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  color: #333333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #e9e9e9;
  border-radius: 2px;
  background: #ffffff;
  color: #000000;
  font-size: 12px;
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.form-input:focus {
  outline: none;
  border-color: #18a0fb;
}

.textarea-container {
  flex: 1;
  min-height: 400px;
  display: flex;
}

.form-textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #e9e9e9;
  border-radius: 2px;
  background: #ffffff;
  color: #000000;
  font-size: 12px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
  resize: none;
  line-height: 1.5;
  min-height: 400px;
}

.form-textarea:focus {
  outline: none;
  border-color: #18a0fb;
}

.form-textarea::placeholder {
  color: #999999;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #e9e9e9;
  margin-top: auto;
  flex-shrink: 0;
}

.btn {
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid transparent;
  transition: all 0.1s ease;
}

.btn-secondary {
  background: #ffffff;
  color: #333333;
  border-color: #e9e9e9;
}

.btn-secondary:hover {
  background: #f8f8f8;
}

.btn-primary {
  background: #18a0fb;
  color: #ffffff;
  border-color: #18a0fb;
}

.btn-primary:hover {
  background: #0d8ce8;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn:disabled:hover {
  background: #18a0fb;
}
</style>

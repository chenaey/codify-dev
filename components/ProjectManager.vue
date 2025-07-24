<script setup lang="ts">
import { useUserProjects, type UserProject } from '@/composables/useUserProjects'
import { options } from '@/ui/state'

import ProjectEditor from './ProjectEditor.vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
}>()

const { userProjects, deleteUserProject, duplicateProject } = useUserProjects()

// 项目编辑器状态
const showProjectEditor = ref(false)
const editingProject = ref<UserProject | null>(null)

// 打开项目编辑器
function openProjectEditor(project?: UserProject) {
  close()
  editingProject.value = project || null
  showProjectEditor.value = true
}

// 删除项目
function handleDeleteProject(projectId: string) {
  if (confirm('确定要删除吗？')) {
    deleteUserProject(projectId)
    // 如果删除的是当前选中的项目，切换到默认项目
    if (options.value.project === projectId) {
      options.value.project = 'mvvm'
    }
  }
}

// 复制项目
function handleDuplicateProject(projectId: string) {
  duplicateProject(projectId)
}

// 关闭弹窗
function close() {
  emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click="close">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title">Manage projects</div>
          <button @click="close" class="modal-close">×</button>
        </div>
        
        <div class="modal-content">
          <div class="project-list">
            <div v-for="project in userProjects" :key="project.id" class="project-item">
              <div class="project-info">
                <span class="project-name">{{ project.name }}</span>
              </div>
              <div class="project-actions">
                <button @click="openProjectEditor(project)" class="btn-small">Edit</button>
                <button @click="handleDuplicateProject(project.id)" class="btn-small">Duplicate</button>
                <button @click="handleDeleteProject(project.id)" class="btn-small btn-danger">Delete</button>
              </div>
            </div>
            
            <div v-if="userProjects.length === 0" class="empty-state">
              No custom projects
            </div>
          </div>
          
          <div class="modal-actions">
            <button @click="openProjectEditor()" class="btn btn-primary">New project</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 项目编辑器 -->
  <ProjectEditor 
    v-model:show="showProjectEditor" 
    :project="editingProject"
  />
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
  z-index: 9999;
}

.modal {
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  max-width: 480px;
  width: 90%;
  max-height: 70vh;
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
}

.project-list {
  flex: 1;
}

.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 2px;
  margin-bottom: 6px;
  background: #ffffff;
}

.project-info .project-name {
  font-size: 12px;
  font-weight: 500;
  color: #000000;
}

.project-actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  text-align: center;
  color: #666666;
  padding: 32px 16px;
  font-size: 12px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #e9e9e9;
  margin-top: auto;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #e9e9e9;
  background: #ffffff;
  color: #333333;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.1s ease;
}

.btn-small:hover {
  background: #f8f8f8;
}

.btn-danger {
  color: #f24822;
  border-color: #f24822;
}

.btn-danger:hover {
  background: rgba(242, 72, 34, 0.1);
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

.btn-primary {
  background: #18a0fb;
  color: #ffffff;
  border-color: #18a0fb;
}

.btn-primary:hover {
  background: #0d8ce8;
}
</style> 
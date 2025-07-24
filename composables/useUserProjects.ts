import { useStorage } from '@vueuse/core'
import { readonly } from 'vue'

interface UserProject {
  id: string
  name: string
  prompt: string
}

const userProjects = useStorage<UserProject[]>('tempad-user-projects', [])

export function useUserProjects() {
  // 获取用户项目
  function getUserProject(projectId: string) {
    return userProjects.value.find(p => p.id === projectId)
  }
  
  // 添加用户项目
  function addUserProject(project: Omit<UserProject, 'id'>) {
    const id = `user_${Date.now()}`
    userProjects.value.push({ ...project, id })
    return id
  }
  
  // 更新用户项目
  function updateUserProject(id: string, updates: Partial<UserProject>) {
    const index = userProjects.value.findIndex(p => p.id === id)
    if (index >= 0) {
      userProjects.value[index] = { ...userProjects.value[index], ...updates }
    }
  }
  
  // 删除用户项目
  function deleteUserProject(id: string) {
    const index = userProjects.value.findIndex(p => p.id === id)
    if (index >= 0) {
      userProjects.value.splice(index, 1)
    }
  }
  
  // 复制项目
  function duplicateProject(sourceId: string) {
    const source = getUserProject(sourceId)
    if (source) {
      return addUserProject({
        name: `${source.name} (副本)`,
        prompt: source.prompt
      })
    }
  }
  
  return {
    userProjects: readonly(userProjects),
    getUserProject,
    addUserProject,
    updateUserProject,
    deleteUserProject,
    duplicateProject
  }
}

export type { UserProject } 
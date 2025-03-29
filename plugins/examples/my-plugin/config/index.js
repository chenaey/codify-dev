// 默认配置
export const DEFAULT_CONFIG = {
    defaultValues: {
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        'line-height': '1.5',
        'font-size': '14px'
    },
    disallowedProperties: [],
    rootFontSize: 16,
    scale: 1
}

// 项目配置列表
export const PROJECTS = [
    {
        id: 'mvvm',
        type: 'h5',
        name: 'MVVM项目',
        description: '使用rem()函数的移动端项目',
        config: {
            ...DEFAULT_CONFIG,
            rootFontSize: 20,
            scale: 2
        }
    },
    {
        id: 'pc',
        type: 'pc',
        name: 'PC项目',
        description: '使用px单位的PC端项目',
        config: {
            ...DEFAULT_CONFIG,
            scale: 1
        }
    }
]

// 获取项目配置
export function getProjectConfig(projectId) {
    const project = PROJECTS.find(p => p.id === projectId)
    return project ? project.config : DEFAULT_CONFIG
} 
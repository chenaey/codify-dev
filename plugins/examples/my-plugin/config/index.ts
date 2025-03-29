// 项目配置接口
export interface ProjectConfig {
  cssUnit: 'px' | 'rem'
  rootFontSize: number
  scale: number
  defaultValues: Record<string, string>
  disallowedProperties?: string[]
}

export interface Project {
  id: string
  name: string
  config: ProjectConfig
}

// 当前配置接口
export interface CurrentConfig {
  defaultValues: Record<string, string>
  disallowedProperties: string[]
}

// 扩展插件选项接口
export interface ExtendedOptions {
  useRem: boolean
  rootFontSize: number
  scale: number
  project?: string
}

// 项目配置列表
export const PROJECTS: Project[] = [
  {
    id: 'mvvm',
    name: 'MVVM',
    config: {
      cssUnit: 'rem',
      rootFontSize: 20,
      scale: 1,
      defaultValues: {
        'font-weight': '400',
        'font-style': 'normal',
        'color': '#000000',
      }
    }
  },
  {
    id: 'cbg',
    name: 'CBG',
    config: {
      cssUnit: 'rem',
      rootFontSize: 16,
      scale: 1,
      defaultValues: {
        'font-weight': '400',
        'font-style': 'normal',
        'color': '#1A1A1A',
      }
    }
  },
  {
    id: 'ios',
    name: 'iOS',
    config: {
      cssUnit: 'px',
      rootFontSize: 16,
      scale: 1,
      defaultValues: {
        'font-weight': '400',
        'font-style': 'normal',
        'color': '#000000',
      },
      disallowedProperties: ['font-family']
    }
  },
  {
    id: 'android',
    name: 'Android',
    config: {
      cssUnit: 'px',
      rootFontSize: 16,
      scale: 1,
      defaultValues: {
        'font-weight': '400',
        'font-style': 'normal',
        'color': '#000000',
      },
      disallowedProperties: ['font-family']
    }
  }
]

// 默认配置
export const DEFAULT_CONFIG: ProjectConfig = {
  cssUnit: 'px',
  rootFontSize: 16,
  scale: 1,
  defaultValues: {
    'font-weight': '400',
    'font-style': 'normal',
    'text-decoration': 'none',
    'color': '#000000',
    'background-color': 'transparent',
    'margin': '0',
    'padding': '0',
    'border': 'none',
    'display': 'block',
  },
  disallowedProperties: ['font-family']
}

// 获取项目配置
export function getProjectConfig(projectId: string): ProjectConfig {
  const project = PROJECTS.find(p => p.id === projectId)
  return project?.config || DEFAULT_CONFIG
} 
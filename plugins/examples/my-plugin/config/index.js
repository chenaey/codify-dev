// 默认配置
export const DEFAULT_CONFIG = {
    defaultValues: {
        'font-style': 'normal',
        'font-weight': '400',
    },
    disallowedProperties: ['font-family', 'gap'],
    rootFontSize: 16,
    scale: 1,
    lessVariables: {}
}

// MVVM项目的less变量映射
const MVVM_LESS_VARS = {
    // 字体大小
    'rem(20)': '@fz-tiny',
    'rem(24)': '@fz-small',
    'rem(28)': '@fz-normal',
    'rem(32)': '@fz-large',
    'rem(36)': '@fz-super',

    // 主要颜色
    '#1e1e1e': '@color-primary',
    '#555555': ['@color-secondary', '@color-darkgray'],
    '#888888': '@color-gray',
    '#CCCCCC': '@color-disabled',
    '#FFFFFF': '@color-white',
    '#FF3A36': ['@color-red', '@color-link', '@color-active'],
    '#3CB034': '@color-green',
    '#729AFF': '@color-blue',
    '#FF769F': '@color-pink',
    '#ccc': '@color-border',
    '#e5e5e5': '@color-divider',
    'rgba(0,0,0,.6)': '@color-mask',
    '#FF8527': '@color-orange',
    '#1a1a1a': '@color-black',
    '#3077FF': '@color-cc-blue'
}

// 项目配置列表
export const PROJECTS = [
    {
        id: 'mvvm',
        config: {
            ...DEFAULT_CONFIG,
            lessVariables: MVVM_LESS_VARS,
            rootFontSize: 20,
            type: 'web',
            scale: 2
        }
    },
    {
        id: 'cbg',
        config: {
            ...DEFAULT_CONFIG,
            type: 'web',
            scale: 1
        }
    },
    {
        id: 'ios',
        config: {
            ...DEFAULT_CONFIG,
            type: 'ios',

        }
    },
    {
        id: 'android',
        config: {
            ...DEFAULT_CONFIG,
            type: 'android',

        }
    }
]

// 获取项目配置
export function getProjectConfig(projectId) {
    const project = PROJECTS.find(p => p.id === projectId)
    return project ? project.config : DEFAULT_CONFIG
}